/**
 * Local fallback redaction.
 * Used when API returns ANONYMIZE or for local pre-redaction.
 */

// ISO 3166-1 alpha-2 (+ XK); must match `detectors.py` for BIC validation.
const ISO_ALPHA2 = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK".split(
    /\s+/,
  ),
);

function isPlausibleSwiftBic(token) {
  const u = String(token).toUpperCase();
  if (u.length !== 8 && u.length !== 11) return false;
  if (!ISO_ALPHA2.has(u.slice(4, 6))) return false;
  if (/^[0-9A-F]+$/i.test(u)) return false;
  return true;
}

const LOCAL_PATTERNS = [
  { type: "EMAIL", regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g },
  {
    type: "PHONE",
    regex:
      /(?:(?<!\d)\+\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{3,4}[\s\-]\d{3,9}(?!\d)|(?<!\d)\(\d{2,4}\)[\s\-]?\d{3,4}[\s\-]\d{4}(?!\d)|\b\d{3}[\s.\-]\d{3}[\s.\-]\d{4}\b|\b\d{2}[\s.\-]\d{2}[\s.\-]\d{2}[\s.\-]\d{2}[\s.\-]\d{2}\b|(?<!\d)\+\d{10,15}(?!\d))/g,
  },
  { type: "IBAN", regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { type: "SWIFT_BIC", regex: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/gi },
  { type: "API_KEY", regex: /\b(?:sk|rk|pk)_[A-Za-z0-9]{16,}\b/g },
  { type: "PASSWORD", regex: /\b(?:password|passphrase|pwd|mot\s*de\s*passe)\b(?:\s*(?:is|est|=|:)\s*|\s+)(?:\"[^\"]{3,}\"|'[^']{3,}'|[^\s,;]{4,})/gi },
  { type: "TOKEN", regex: /\b(?:token|bearer)\s*[:=]?\s*[A-Za-z0-9\-_\.]{12,}\b/gi },
  { type: "INTERNAL_URL", regex: /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[a-zA-Z0-9\-]+\.internal)\S*/g },
];

function applyLocalRedaction(text) {
  let output = text;
  const applied = [];

  for (const pattern of LOCAL_PATTERNS) {
    output = output.replace(pattern.regex, (match) => {
      if (pattern.type === "SWIFT_BIC" && !isPlausibleSwiftBic(match)) {
        return match;
      }
      applied.push({ original: match, replacement: `[REDACTED_${pattern.type}]` });
      return `[REDACTED_${pattern.type}]`;
    });
  }

  return { text: output, applied };
}

window.ConfidentialAgentRedactor = {
  applyLocalRedaction,
};
