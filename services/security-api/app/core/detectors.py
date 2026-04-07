import re
from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass
class DetectorHit:
    hit_type: str
    raw_value: str
    confidence: float
    span_start: int | None = None
    span_end: int | None = None


DETECTOR_PATTERNS: dict[str, re.Pattern[str]] = {
    "EMAIL": re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b"),
    # Require structural markers (country prefix, parentheses, or explicit separators)
    # to avoid false-positives on port numbers, version strings, and timestamps.
    # Note: patterns starting with '+' or '(' cannot use a leading \b because
    # those characters are not word characters.
    "PHONE": re.compile(
        r"(?:"
        r"(?<!\d)\+\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{3,4}[\s\-]\d{3,9}(?!\d)"  # +1 (555) 555-5555
        r"|(?<!\d)\(\d{2,4}\)[\s\-]?\d{3,4}[\s\-]\d{4}(?!\d)"                       # (555) 555-5555
        r"|\b\d{3}[\s.\-]\d{3}[\s.\-]\d{4}\b"                                        # 555-555-5555
        r"|\b\d{2}[\s.\-]\d{2}[\s.\-]\d{2}[\s.\-]\d{2}[\s.\-]\d{2}\b"              # FR: 06 12 34 56 78
        # E.164 compact (no separators), e.g. +33612345678 — max 15 digits after '+'
        r"|(?<!\d)\+\d{10,15}(?!\d)"
        r")"
    ),
    "IBAN": re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b"),
    "API_KEY": re.compile(r"\b(?:sk|rk|pk)_[A-Za-z0-9]{16,}\b"),
    "PASSWORD": re.compile(
        r"(?i)\b(?:password|passphrase|pwd|mot\s*de\s*passe)\b(?:\s*(?:is|est|=|:)\s*|\s+)(?:\"[^\"]{3,}\"|'[^']{3,}'|[^\s,;]{4,})"
    ),
    "TOKEN": re.compile(r"(?i)\b(?:token|bearer)\s*[:=]?\s*[A-Za-z0-9\-_\.]{12,}\b"),
    "INTERNAL_URL": re.compile(
        r"\bhttps?://(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[a-zA-Z0-9\-]+\.internal)\S*"
    ),
    # Simple heuristic: detect common source-code signatures.
    "SOURCE_CODE": re.compile(r"(?m)^\s*(?:def |class |function |import |from .* import )"),
    # French / English phrases suggesting identifiable HR, health, or family context
    # (deterministic complement to the LLM LEGAL_HR classifier).
    "LEGAL_HR": re.compile(
        r"(?i)"
        r"(?:"
        r"(?:l['\u2019]\s*)?arrêt\s+(?:maladie|de\s+travail)"
        r"|médecin\s+du\s+travail"
        r"|médecine\s+du\s+travail"
        r"|aménagement\s+de\s+poste"
        r"|accident\s+du\s+travail"
        r"|(?:données?\s+de\s+santé|dossier\s+médical|secret\s+médical)"
        r"|visite\s+médicale"
        r"|indemnité\s+journalière"
        r"|congé\s+(?:maternité|paternité)"
        r"|invalidité\s+(?:professionnelle|permanente|partielle)"
        r"|reclassement\s+professionnel"
        r"|fiche\s+salarié"
        r"|situation\s+familiale"
        r"|garde\s+alternée"
        r"|pension\s+alimentaire"
        r"|autorité\s+parentale"
        r"|acte\s+de\s+naissance"
        r"|ressources?\s+humaines\s+confidentiel(?:le|les)?"
        r"|occupational\s+health\s+(?:physician|doctor|assessment)"
        r"|sick\s+leave|family\s+leave|parental\s+leave"
        r"|medical\s+leave|disability\s+accommodation"
        r")"
    ),
    # ── Harmful / adult domain links ─────────────────────────────────────────
    "HARMFUL_URL": re.compile(
        r"https?://(?:www\.)?"
        r"(?:pornhub|xvideos|xhamster|youporn|redtube|brazzers|naughtyamerica"
        r"|xnxx|tube8|thumbzilla|chaturbate|myfreecams|cam4|stripchat"
        r"|livejasmin|bongacams|onlyfans|manyvids|fancentro"
        r"|bestgore|goregrish|shockgore|liveleak|rotten|watchpeopledie"
        r"|sickchirpse|ogrish|nsfl)"
        r"\.(?:com|net|org|tv|xxx)(?:[/\?#][^\s]*)?",
        re.IGNORECASE,
    ),
    # ── Profanity / toxic language quick-filter ──────────────────────────────
    # Regex matches the most unambiguous profanity in English and French.
    # This is intentionally conservative to minimise false positives.
    # The LLM-based toxicity analyzer handles nuanced aggressive tone.
    "TOXIC_LANGUAGE": re.compile(
        r"(?i)\b(?:"
        # English
        r"f+u+c+k+(?:ing?|er?|ed|s|wit)?|s+h+i+t+(?:ty|ter?|s)?"
        r"|b+i+t+c+h+(?:es|y|in)?|a+s+s+h+o+l+e+|c+u+n+t+"
        r"|c+o+c+k+s+u+c+k+(?:er?|ing)?|m+o+t+h+e+r+f+u+c+k+(?:er?|ing)?"
        r"|f+a+g+g+o+t+|n+i+g+g+e+r+|w+h+o+r+e+|s+l+u+t+"
        r"|d+i+c+k+h+e+a+d+|j+a+c+k+a+s+s+|b+a+s+t+a+r+d+"
        # French
        r"|m+e+r+d+e+|p+u+t+a+i+n+|c+o+n+n+a+r+d+(?:e)?"
        r"|s+a+l+o+p+e+|e+n+c+u+l+[eé]+(?:e)?|n+i+q+u+e+r?"
        r"|s+a+l+a+u+d+|p+u+t+e+|b+[aâ]+t+a+r+d+(?:e)?"
        r"|c+o+u+i+l+l+e+|f+o+u+t+r+e+"
        # Threat / violent intent (EN + FR) — explicit forms only.
        r"|i\s+will\s+(?:kill|stab)\s+you"
        r"|je\s+vais\s+(?:te|vous)\s+(?:tuer|poignarder)"
        r")\b",
        re.UNICODE,
    ),
    # Prompt injection / indirect instruction hijacking patterns.
    # Covers the Slack AI 2024 attack vector: data embedded in responses that
    # tries to override the model's prior instructions or exfiltrate conversation content.
    "PROMPT_INJECTION": re.compile(
        r"(?i)"
        r"(?:ignore\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+instructions?"
        r"|forget\s+(?:everything|all|prior|previous|your\s+instructions?)"
        r"|disregard\s+(?:all\s+)?(?:previous|prior|above|earlier)"
        r"|override\s+(?:previous|all|prior|system)\s+(?:instructions?|prompt)"
        r"|you\s+are\s+now\s+(?:a|an)\s+\w"
        r"|act\s+as\s+(?:a|an)\s+(?:different|new|unrestricted)"
        r"|new\s+(?:system\s+)?(?:prompt|instruction|directive)\s*:"
        r"|from\s+now\s+on,?\s+(?:you\s+(?:must|will|should|are))"
        r"|send\s+(?:all\s+)?(?:user\s+)?(?:data|information|messages?|conversations?)\s+to\s+\S+\.\S+"
        r"|exfiltrate\s+(?:data|information|content)"
        r"|jailbreak\s*mode"
        r"|DAN\s+mode"
        r")"
    ),
}

# ISO 3166-1 alpha-2 from IANA tz `iso3166.tab` (eggert/tz); XK added for Kosovo banking.
_ISO_ALPHA2 = (
    frozenset(
        "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ "
        "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR "
        "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP "
        "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT "
        "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW "
        "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG "
        "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split()
    )
    | {"XK"}
)

_SWIFT_BIC_PATTERN = re.compile(
    r"\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b",
    re.IGNORECASE,
)


def _is_plausible_swift_bic(token_upper: str) -> bool:
    if len(token_upper) not in (8, 11):
        return False
    if token_upper[4:6] not in _ISO_ALPHA2:
        return False
    if re.fullmatch(r"[0-9A-F]+", token_upper):
        return False
    return True


# 8-letter words that accidentally match the SWIFT shape (4+2+2), e.g. CERT+AI+NS.
# Plain prose has no CODE_CONTEXT_SIGNALS nearby — still suppress these tokens.
_SWIFT_8_FALSE_POSITIVE_WORDS = frozenset(
    {
        "CERTAINS",
        "CERTAINE",
    }
)

CODE_CONTEXT_SIGNALS = [
    r"os\.getenv",
    r"import\s+",
    r"def\s+\w+",
    r"class\s+\w+",
    r"=\s*[\"']",
    r"http[s]?://",
    r"\w+\.\w+\(",
    r"```",
    r"#\s+",
    r"pip\s+install",
    r"npm\s+",
    r"<[a-zA-Z]+>",
]

_CODE_CONTEXT_COMPILED = [
    re.compile(p, re.IGNORECASE | re.MULTILINE) for p in CODE_CONTEXT_SIGNALS
]


def is_code_context(text: str, match_start: int, match_end: int, window: int = 150) -> bool:
    """
    True if the match sits in a code / technical context (fuzzy window).
    Fail-open: on any error, returns False so we do not drop a potential true positive.
    """
    try:
        lo = max(0, match_start - window)
        hi = min(len(text), match_end + window)
        chunk = text[lo:hi]
        return any(p.search(chunk) for p in _CODE_CONTEXT_COMPILED)
    except Exception:
        return False


REDACTED_PLACEHOLDER_PATTERN = re.compile(r"\[REDACTED_[A-Z_]+\]")


def _preview(text: str, max_len: int = 24) -> str:
    clean = text.replace("\n", " ")
    if len(clean) <= max_len:
        return clean
    return clean[: max_len - 3] + "..."


def detect_sensitive_content(prompt: str) -> list[DetectorHit]:
    """
    Deterministic regex-based detection, optionally reinforced with spaCy phrase
    matching for LEGAL_HR variants (see app.core.spacy_detectors).
    """
    from app.core.spacy_detectors import collect_spacy_legal_hr_spans

    hits: list[DetectorHit] = []

    for hit_type, pattern in DETECTOR_PATTERNS.items():
        for match in pattern.finditer(prompt):
            raw_value = match.group(0)
            if REDACTED_PLACEHOLDER_PATTERN.search(raw_value):
                continue
            s, e = match.span()
            hits.append(
                DetectorHit(
                    hit_type=hit_type,
                    raw_value=raw_value,
                    confidence=0.8 if hit_type != "SOURCE_CODE" else 0.65,
                    span_start=s,
                    span_end=e,
                )
            )

    for match in _SWIFT_BIC_PATTERN.finditer(prompt):
        raw_value = match.group(0)
        if REDACTED_PLACEHOLDER_PATTERN.search(raw_value):
            continue
        token_upper = raw_value.upper()
        if not _is_plausible_swift_bic(token_upper):
            continue
        s, e = match.span()
        if len(token_upper) == 8 and token_upper in _SWIFT_8_FALSE_POSITIVE_WORDS:
            continue
        if is_code_context(prompt, s, e):
            continue
        hits.append(
            DetectorHit(
                hit_type="SWIFT_BIC",
                raw_value=raw_value,
                confidence=0.85,
                span_start=s,
                span_end=e,
            )
        )

    legal_spans = [
        (h.span_start, h.span_end)
        for h in hits
        if h.hit_type == "LEGAL_HR" and h.span_start is not None and h.span_end is not None
    ]
    for raw_value, s, e in collect_spacy_legal_hr_spans(prompt, legal_spans):
        if REDACTED_PLACEHOLDER_PATTERN.search(raw_value):
            continue
        hits.append(
            DetectorHit(
                hit_type="LEGAL_HR",
                raw_value=raw_value,
                confidence=0.75,
                span_start=s,
                span_end=e,
            )
        )
        legal_spans.append((s, e))

    return hits


def build_redactions(hits: list[DetectorHit]) -> list[dict[str, str]]:
    replacements: list[dict[str, str]] = []
    for hit in hits:
        placeholder = f"[REDACTED_{hit.hit_type}]"
        replacements.append(
            {
                "original": hit.raw_value,
                "replacement": placeholder,
                "reason": f"Sensitive pattern detected: {hit.hit_type}",
            }
        )
    return replacements


def build_url_protection_patterns(protected_urls: list[str]) -> list[tuple[str, re.Pattern[str]]]:
    """
    Build (label, compiled_regex) pairs from user-configured URLs.

    - Host-only (path empty or "/"): match http(s)://<host>... non-whitespace tail.
    - With path: exact literal match of the normalized URL string.
    """
    result: list[tuple[str, re.Pattern[str]]] = []
    for raw in protected_urls:
        s = (raw or "").strip()
        if not s:
            continue
        normalized = s if "://" in s else f"https://{s}"
        try:
            parsed = urlparse(normalized)
        except Exception:
            continue
        netloc = (parsed.netloc or "").strip().lower()
        if not netloc:
            continue
        path = parsed.path or ""
        if path in ("", "/"):
            host_label = netloc.split(":")[0].replace(".", "_").upper()
            label = f"URL_{host_label}"
            pattern = re.compile(
                r"https?://" + re.escape(netloc) + r"[^\s]*",
                re.IGNORECASE,
            )
        else:
            label = "URL_CONFIDENTIELLE"
            pattern = re.compile(re.escape(normalized), re.IGNORECASE)
        result.append((label, pattern))
    return result
