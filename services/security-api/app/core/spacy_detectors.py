"""
Optional spaCy PhraseMatcher for LEGAL_HR: plurals and phrasing variants that are
tedious to cover exhaustively with regex alone. Complements DETECTOR_PATTERNS in
detectors.py — same hit_type and policy weights apply.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from spacy.language import Language
    from spacy.matcher import PhraseMatcher

logger = logging.getLogger(__name__)

SPACY_LEGAL_HR_PHRASES: tuple[str, ...] = (
    "arrêts maladie",
    "arrêts de travail",
    "médecins du travail",
    "médecines du travail",
    "congés maternité",
    "congés paternité",
    "dossiers médicaux",
    "données de santé",
    "donnée de santé",
    "visites médicales",
    "indemnités journalières",
    "invalidités professionnelles",
    "actes de naissance",
    "pensions alimentaires",
    "autorités parentales",
    "sick leaves",
    "parental leaves",
    "medical records",
    "occupational health physician",
    "workers compensation",
    "family medical leave",
    "disability accommodations",
)

_nlp: Language | None = None
_matcher: PhraseMatcher | None = None
_load_error: str | None = None


def _ensure_matcher() -> tuple[Language | None, PhraseMatcher | None]:
    global _nlp, _matcher, _load_error
    if not settings.spacy_enabled:
        return None, None
    if _load_error is not None:
        return None, None
    if _matcher is not None and _nlp is not None:
        return _nlp, _matcher
    try:
        import spacy
        from spacy.matcher import PhraseMatcher as PM

        _nlp = spacy.load(settings.spacy_model)
        matcher = PM(_nlp.vocab, attr="LOWER")
        patterns = [_nlp.make_doc(p) for p in SPACY_LEGAL_HR_PHRASES]
        matcher.add("LEGAL_HR", patterns)
        _matcher = matcher
        return _nlp, _matcher
    except Exception as e:
        _load_error = str(e)
        logger.warning(
            "spaCy LEGAL_HR matcher disabled (%s). Install model: python -m spacy download %s",
            e,
            settings.spacy_model,
        )
        return None, None


def is_spacy_legal_hr_ready() -> bool:
    _, matcher = _ensure_matcher()
    return matcher is not None


def collect_spacy_legal_hr_spans(
    text: str,
    existing_legal_spans: list[tuple[int, int]],
) -> list[tuple[str, int, int]]:
    nlp, matcher = _ensure_matcher()
    if nlp is None or matcher is None or not text.strip():
        return []

    doc = nlp(text)
    used: list[tuple[int, int]] = list(existing_legal_spans)

    def overlaps_any(start: int, end: int) -> bool:
        for s, e in used:
            if not (end <= s or e <= start):
                return True
        return False

    out: list[tuple[str, int, int]] = []
    for _match_id, start_tok, end_tok in matcher(doc):
        span = doc[start_tok:end_tok]
        s_char, e_char = span.start_char, span.end_char
        if overlaps_any(s_char, e_char):
            continue
        raw = span.text.strip()
        if len(raw) < 3:
            continue
        out.append((raw, s_char, e_char))
        used.append((s_char, e_char))

    return out
