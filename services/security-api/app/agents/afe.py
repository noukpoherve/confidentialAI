from __future__ import annotations

import logging
import re
from functools import lru_cache

from app.core.detectors import (
    DetectorHit,
    build_redactions,
    build_url_protection_patterns,
    detect_sensitive_content,
)
from app.core.config import settings
from app.core.policy_engine import (
    PolicyDecision,
    _build_detections,
    _decide_action,
    _score_hits,
    analyze_prompt,
)
from app.core.user_store import get_user_store

logger = logging.getLogger(__name__)


def _dev_debug_enabled() -> bool:
    return settings.app_env in {"dev", "development", "local"}


def _debug_person_filter(reason: str, text: str, label: str | None = None) -> None:
    if not _dev_debug_enabled():
        return
    if label:
        logger.debug("[spaCy PERSON filter] %s | label=%s | text=%r", reason, label, text)
    else:
        logger.debug("[spaCy PERSON filter] %s | text=%r", reason, text)

ENGLISH_VERBS = frozenset(
    {
        "generate",
        "create",
        "update",
        "delete",
        "get",
        "post",
        "put",
        "send",
        "receive",
        "process",
        "analyze",
        "check",
        "validate",
        "run",
        "execute",
        "show",
        "display",
        "find",
        "search",
        "list",
        "add",
        "remove",
        "set",
        "reset",
        "load",
        "save",
        "import",
        "export",
        "fetch",
        "build",
        "deploy",
    }
)

FRENCH_VERBS = frozenset(
    {
        "générer",
        "créer",
        "mettre",
        "supprimer",
        "obtenir",
        "envoyer",
        "recevoir",
        "traiter",
        "analyser",
        "vérifier",
        "valider",
        "exécuter",
        "afficher",
        "trouver",
        "chercher",
        "ajouter",
        "retirer",
        "définir",
        "charger",
        "sauvegarder",
    }
)

# Tokens commonly found in insults/profanity that must never be interpreted as person names.
PROFANITY_TOKENS = frozenset(
    {
        "fuck",
        "fucking",
        "shit",
        "bitch",
        "asshole",
        "bastard",
        "foutre",
        "merde",
        "con",
        "connard",
        "salope",
        "pute",
    }
)

# Prefer large models when installed; fall back to sm so NER still runs (lg is often missing locally).
_FR_NER_MODELS = ("fr_core_news_lg", "fr_core_news_md", "fr_core_news_sm")
_EN_NER_MODELS = ("en_core_web_lg", "en_core_web_md", "en_core_web_sm")


@lru_cache(maxsize=8)
def _load_spacy_model(model_name: str):
    import spacy
    return spacy.load(model_name)


def _nlp_for_ner(lang_code: str):
    """
    Return a loaded spaCy pipeline for NER, or None if no model could be loaded.
    French text → try French models first; other languages → English then French sm as last resort.
    """
    use_fr = lang_code == "fr"
    candidates = _FR_NER_MODELS if use_fr else (*_EN_NER_MODELS, *_FR_NER_MODELS)
    last_err: Exception | None = None
    for name in candidates:
        try:
            nlp = _load_spacy_model(name)
            if name != (candidates[0] if use_fr else _EN_NER_MODELS[0]):
                logger.info("spaCy NER using fallback model %s (preferred lg/md not installed)", name)
            return nlp
        except Exception as e:
            last_err = e
            continue
    if last_err:
        logger.warning(
            "spaCy NER disabled — no usable model (%s). Install: python -m spacy download fr_core_news_sm",
            last_err,
        )
    return None


def _detect_language_code(text: str) -> str:
    try:
        from langdetect import detect
        if not (text or "").strip():
            return "en"
        return detect(text)
    except Exception:
        return "en"


def _map_spacy_label(label: str) -> str:
    u = label.upper()
    if u in ("PER", "PERSON"):
        return "PERSONNE"
    if u in ("LOC", "GPE"):
        return "LIEU"
    if u == "ORG":
        return "ORGANISATION"
    if u == "DATE":
        return "DATE"
    if u == "TIME":
        return "HORAIRE"
    if u == "MONEY":
        return "INFORMATION_FINANCIÈRE"
    if u == "MISC":
        return "INFORMATION_PERSONNELLE"
    return "INFORMATION_PERSONNELLE"


def _entity_overlaps_regex(ent_text: str, originals: set[str]) -> bool:
    """True if this span is already covered by a regex redaction (exact or substring)."""
    t = ent_text.strip()
    if not t:
        return True
    if t in originals:
        return True
    for o in originals:
        if len(o) >= len(t) and t in o:
            return True
    return False


def _reject_per_person_entity(ent, prompt: str) -> bool:
    """True → skip this PER / PERSON entity (false positive heuristics)."""
    text = ent.text.strip()
    tl = text.lower()
    words = [w for w in re.split(r"\s+", text) if w]
    if tl in ENGLISH_VERBS | FRENCH_VERBS:
        _debug_person_filter("reject: verb-like token", text, getattr(ent, "label_", None))
        return True
    if any(w.lower() in PROFANITY_TOKENS for w in words):
        _debug_person_filter("reject: profanity token", text, getattr(ent, "label_", None))
        return True
    # PERSON entities are expected to contain at least one capitalized token.
    # Lowercase chunks such as "fuck you" should be rejected as false positives.
    if not any((w[:1].isupper() and any(c.isalpha() for c in w)) for w in words):
        _debug_person_filter("reject: no capitalized token", text, getattr(ent, "label_", None))
        return True
    if len(text.split()) < 2:
        if ent.start == 0:
            _debug_person_filter("reject: single token at sentence start", text, getattr(ent, "label_", None))
            return True
        if ent.start_char >= 2 and prompt[ent.start_char - 2] in ".!?\n":
            _debug_person_filter("reject: single token after punctuation", text, getattr(ent, "label_", None))
            return True
    if text.isupper():
        _debug_person_filter("reject: all uppercase", text, getattr(ent, "label_", None))
        return True
    if "_" in text or "-" in text:
        _debug_person_filter("reject: contains underscore/hyphen", text, getattr(ent, "label_", None))
        return True
    _debug_person_filter("accept", text, getattr(ent, "label_", None))
    return False


def spacy_detect(doc, prompt: str):
    """
    Yield named entities from a spaCy doc, applying PER/PERSON filters and a minimum length.
    """
    for ent in doc.ents:
        text = ent.text.strip()
        if len(text) < 4:
            continue
        if ent.label_ in ("PER", "PERSON"):
            if _reject_per_person_entity(ent, prompt):
                continue
        yield ent


def _apply_spacy_ner(decision: PolicyDecision, prompt: str) -> PolicyDecision:
    try:
        lang = _detect_language_code(prompt)
        nlp = _nlp_for_ner("fr" if lang == "fr" else "en")
        if nlp is None:
            return decision
        doc = nlp(prompt)
    except Exception:
        return decision

    already_covered: set[str] = {
        str(r.get("original", "")) for r in decision.redactions if r.get("original")
    }
    seen_span: set[tuple[int, int]] = set()
    added = 0

    for ent in spacy_detect(doc, prompt):
        key = (ent.start_char, ent.end_char)
        if key in seen_span:
            continue
        seen_span.add(key)

        text = ent.text.strip()
        if _entity_overlaps_regex(text, already_covered):
            continue

        semantic = _map_spacy_label(ent.label_)
        preview = (text[:21] + "...") if len(text) > 24 else text
        decision.detections.append(
            {
                "type": semantic,
                "valuePreview": preview,
                "confidence": 0.75,
            }
        )
        decision.redactions.append(
            {
                "original": text,
                "replacement": f"[{semantic}]",
                "reason": f"spaCy NER ({ent.label_}): {semantic}",
            }
        )
        already_covered.add(text)
        added += 1

    if added > 0 and decision.action == "ALLOW":
        decision.action = "WARN"
        if decision.risk_score < 40:
            decision.risk_score = 40
        decision.reasons.append("Named entities detected (spaCy NER).")

    return decision


def run_afe(prompt: str, user_consent: bool | None, user_id: str | None = None) -> PolicyDecision:
    """
    AFE (Input Filtering Agent) for prompt-level risk analysis.
    Delegates to deterministic policy logic, then enriches with spaCy NER for
    entities not matched by regex (fail-open if NER unavailable).
    When user_id is set, user-configured protected URLs are matched in the prompt.
    """
    decision = analyze_prompt(prompt=prompt, user_consent=user_consent)

    url_hits: list[DetectorHit] = []
    if user_id:
        try:
            user_settings = get_user_store().get_user_settings(user_id)
            protected_urls = list(user_settings.get("protected_urls") or [])
            for label, compiled in build_url_protection_patterns(protected_urls):
                for m in compiled.finditer(prompt):
                    url_hits.append(
                        DetectorHit(
                            hit_type=label,
                            raw_value=m.group(0),
                            confidence=0.9,
                            span_start=m.start(),
                            span_end=m.end(),
                        )
                    )
        except Exception:
            logger.exception("Protected URL scan failed")

    if url_hits:
        base_hits = detect_sensitive_content(prompt)
        all_hits = base_hits + url_hits
        hit_types_list = [h.hit_type for h in all_hits]
        risk_score = _score_hits(hit_types_list)
        action, reasons = _decide_action(risk_score, set(hit_types_list), user_consent)
        redactions = build_redactions(all_hits) if action in {"ANONYMIZE", "WARN", "BLOCK"} else []
        decision = PolicyDecision(
            action=action,
            risk_score=risk_score,
            reasons=reasons,
            detections=_build_detections(all_hits),
            redactions=redactions,
            created_at=decision.created_at,
            suggestions=decision.suggestions,
        )

    try:
        return _apply_spacy_ner(decision, prompt)
    except Exception:
        return decision
