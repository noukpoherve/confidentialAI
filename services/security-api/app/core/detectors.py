import re
from dataclasses import dataclass


@dataclass
class DetectorHit:
    hit_type: str
    raw_value: str
    confidence: float


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

REDACTED_PLACEHOLDER_PATTERN = re.compile(r"\[REDACTED_[A-Z_]+\]")


def _preview(text: str, max_len: int = 24) -> str:
    clean = text.replace("\n", " ")
    if len(clean) <= max_len:
        return clean
    return clean[: max_len - 3] + "..."


def detect_sensitive_content(prompt: str) -> list[DetectorHit]:
    """
    Deterministic regex-based detection.
    This layer is intentionally simple and explainable for V1.
    """
    hits: list[DetectorHit] = []

    for hit_type, pattern in DETECTOR_PATTERNS.items():
        for match in pattern.finditer(prompt):
            raw_value = match.group(0)
            # Already-redacted placeholders should not be re-flagged as sensitive.
            if REDACTED_PLACEHOLDER_PATTERN.search(raw_value):
                continue
            hits.append(
                DetectorHit(
                    hit_type=hit_type,
                    raw_value=raw_value,
                    confidence=0.8 if hit_type != "SOURCE_CODE" else 0.65,
                )
            )

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
