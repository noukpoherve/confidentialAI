/**
 * Local fallback redaction.
 * Used when API returns ANONYMIZE or for local pre-redaction.
 */

const LOCAL_PATTERNS = [
  { type: "EMAIL", regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g },
  { type: "PHONE", regex: /\b(?:\+?\d{1,3}[\s\-]?)?(?:\d[\s\-]?){7,12}\b/g },
  { type: "IBAN", regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { type: "API_KEY", regex: /\b(?:sk|rk|pk)_[A-Za-z0-9]{16,}\b/g },
];

function applyLocalRedaction(text) {
  let output = text;
  const applied = [];

  for (const pattern of LOCAL_PATTERNS) {
    output = output.replace(pattern.regex, (match) => {
      applied.push({ original: match, replacement: `[REDACTED_${pattern.type}]` });
      return `[REDACTED_${pattern.type}]`;
    });
  }

  return { text: output, applied };
}

window.ConfidentialAgentRedactor = {
  applyLocalRedaction,
};
