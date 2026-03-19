from app.core.policy_engine import analyze_prompt


def test_allow_simple_prompt() -> None:
    result = analyze_prompt("Explain what zero trust means in security.")
    assert result.action == "ALLOW"
    assert result.risk_score < 15


def test_block_secret_prompt() -> None:
    result = analyze_prompt("Please debug this key: sk_1234567890ABCDEFGHIJKLMNOP")
    assert result.action == "BLOCK"
    assert result.risk_score >= 40


def test_anonymize_email_prompt() -> None:
    result = analyze_prompt("Contact me at alice@example.com for details.")
    assert result.action in {"ANONYMIZE", "WARN"}
    assert len(result.redactions) >= 1


def test_block_password_natural_language_prompt() -> None:
    result = analyze_prompt("Mon mot de passe est SuperSecret2026! Ne le partage pas.")
    assert result.action == "BLOCK"
    assert any(detection["type"] == "PASSWORD" for detection in result.detections)


def test_allow_already_redacted_placeholders() -> None:
    result = analyze_prompt(
        "Generate a sample with [REDACTED_INTERNAL_URL], [REDACTED_API_KEY], and [REDACTED_PASSWORD]."
    )
    assert result.action == "ALLOW"
    assert result.risk_score == 0
    assert len(result.detections) == 0
