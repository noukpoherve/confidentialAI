/**
 * Platform seed and host-resolution utilities.
 *
 * Built-in seeds: zero-config for known products (selectors as hints).
 * User-added sites: hostname only (e.g. github.com) protects the whole host; a full URL
 * with a path (e.g. https://github.com/org/repo/pull/1) protects only that path prefix.
 * The content script discovers composers via universal heuristics when the page matches.
 */

const GENERIC_SEND_BUTTON_PATTERNS = [
  /send/i,
  /submit/i,
  /ask/i,
  /run/i,
  /post/i,
  /comment/i,
  /reply/i,
  /review/i,
  /envoyer/i,
  /publier/i,
  /message/i,
];
const GENERIC_SEND_BUTTON_SELECTORS = [
  'button[type="submit"]',
  'form button[type="submit"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Submit" i]',
  'button[aria-label*="Ask" i]',
  'button[aria-label*="Run" i]',
  'button[aria-label*="Post" i]',
  'button[aria-label*="Comment" i]',
  'button[aria-label*="Reply" i]',
  'button[aria-label*="Review" i]',
  'button[aria-label*="Envoyer" i]',
  'button[aria-label*="Publier" i]',
];
// Google AI UIs (Stitch, Gemini-style) often use <rich-textarea>; try before generic textarea
// so we do not lock onto a hidden <textarea> elsewhere on the page.
const GENERIC_PROMPT_SELECTORS = [
  "rich-textarea",
  'div[contenteditable="true"][role="textbox"]',
  "textarea",
  'div[contenteditable="true"]',
  'input[type="text"]',
];
const GENERIC_RESPONSE_SELECTORS = ['main article', '[role="article"]', '.markdown', '.prose'];

// ── Feature flags ────────────────────────────────────────────────────────────
// "textAnalysis"   — intercept text content before send + scan responses
// "imageModeration"— intercept file/paste uploads and moderate image content

// Social media post composers — targets the actual post box, not search bars.
const SOCIAL_PROMPT_SELECTORS = [
  'div[role="textbox"]',                     // Facebook, LinkedIn, Discord
  'div[data-testid="tweetTextarea_0"]',      // X/Twitter (main)
  'div[data-testid="tweetTextarea_0RichTextInputContainer"]',
  'div[contenteditable="true"][spellcheck]', // Twitter/Reddit fallback
  'div.ql-editor[contenteditable="true"]',   // LinkedIn rich editor
  'div[data-slate-editor="true"]',           // Discord / Reddit
  'textarea[name="text"]',                   // Reddit, TikTok
  'div[contenteditable="true"]',             // Generic fallback
];

// Social-media-aware send / post buttons.
const SOCIAL_SEND_BUTTON_SELECTORS = [
  // Facebook / Instagram
  'div[aria-label="Post"]', 'div[aria-label="Publier"]',
  'button[aria-label*="Post" i]', 'button[aria-label*="Publier" i]',
  // X / Twitter
  'button[data-testid="tweetButton"]', 'button[data-testid="tweetButtonInline"]',
  // LinkedIn
  'button.share-actions__primary-action',
  'button[aria-label*="Post" i]', 'button[aria-label*="Share" i]',
  // Discord
  'button[aria-label*="Send Message" i]',
  // Reddit
  'button[aria-label*="Post" i]',
  'button[data-click-id="text"]',
  // Generic fallback (already in GENERIC, but keep explicit here)
  'button[type="submit"]', 'form button[type="submit"]',
  'button[aria-label*="Envoyer" i]', 'button[aria-label*="Partager" i]',
];

const SOCIAL_SEND_BUTTON_PATTERNS = [
  /post/i, /tweet/i, /share/i, /send/i, /publish/i,
  /comment/i, /reply/i, /review/i,
  /publier/i, /partager/i, /envoyer/i,
];

/** GitHub / GitLab — PR & issue comment boxes use “Comment” / “Reply”, not “Send”. */
const CODE_HOST_PROMPT_SELECTORS = [
  "textarea.js-comment-field",
  "textarea.js-tracked-tooltipped-comment",
  'textarea[name="comment[body]"]',
  "textarea[id^=merge_request]",
  "textarea#note_note",
  ...GENERIC_PROMPT_SELECTORS,
];

const PLATFORM_SEED = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    type: "ai",
    features: ["textAnalysis", "imageModeration"],
    domains: ["chatgpt.com"],
    sendButtonPatterns: [/send/i],
    sendButtonSelectors: [
      'button[data-testid="send-button"]',
      'button[data-testid*="send"]',
      ...GENERIC_SEND_BUTTON_SELECTORS,
    ],
    promptSelectors: [
      '#prompt-textarea',
      'textarea[data-id="root"]',
      'textarea[placeholder*="Message" i]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
      'div[contenteditable="true"][role="textbox"]',
    ],
    responseSelectors: [
      // Primary: scoped to assistant messages only (avoids scanning user bubbles)
      'div[data-message-author-role="assistant"] .markdown.prose',
      'div[data-message-author-role="assistant"] .markdown',
      'div[data-message-author-role="assistant"]',
      // Fallback selectors for ChatGPT DOM variants
      'article[data-testid*="conversation-turn-"] .markdown',
      'article[data-testid*="conversation-turn-"]',
      '[data-testid="conversation-turn-2"] .markdown',   // alternating turn indices
      '[data-testid="conversation-turn-4"] .markdown',
      '[data-testid="conversation-turn-6"] .markdown',
      '.agent-turn .markdown',
      ...GENERIC_RESPONSE_SELECTORS,
    ],
  },
  {
    id: "claude",
    label: "Claude",
    type: "ai",
    features: ["textAnalysis", "imageModeration"],
    domains: ["claude.ai"],
    sendButtonPatterns: [/send/i, /submit/i],
    sendButtonSelectors: GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: [
      'div[contenteditable="true"][aria-label*="message" i]',
      'div[contenteditable="true"]',
      'textarea',
    ],
    responseSelectors: [
      // Claude's assistant message containers
      '[data-testid="assistant-message"]',
      'div[data-testid*="message-content"]',
      '.font-claude-message',
      'main [role="article"]',
      'main .prose',
      ...GENERIC_RESPONSE_SELECTORS,
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    type: "ai",
    features: ["textAnalysis", "imageModeration"],
    domains: ["gemini.google.com"],
    sendButtonPatterns: [/send/i, /run/i, /ask/i],
    sendButtonSelectors: GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: ['textarea', 'div[contenteditable="true"]', 'rich-textarea'],
    responseSelectors: [
      'message-content .markdown',
      'message-content',
      'model-response .markdown',
      'model-response',
      '[data-test-id*="response"]',
      'main article',
      ...GENERIC_RESPONSE_SELECTORS,
    ],
  },
  { id: "copilot",     label: "Microsoft Copilot", type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["copilot.microsoft.com"] },
  { id: "perplexity",  label: "Perplexity",         type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["perplexity.ai"] },
  {
    id: "google-stitch",
    label: "Google Stitch",
    type: "ai",
    features: ["textAnalysis", "imageModeration"],
    domains: ["stitch.withgoogle.com"],
    sendButtonPatterns: [/send/i, /submit/i, /run/i, /ask/i],
    sendButtonSelectors: [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Run" i]',
      'button[aria-label*="Submit" i]',
      'button[aria-label*="Ask" i]',
      ...GENERIC_SEND_BUTTON_SELECTORS,
    ],
    promptSelectors: [
      "rich-textarea",
      'textarea[placeholder*="Ask" i]',
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="What" i]',
      'textarea[placeholder*="Tell" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      "textarea",
      ...GENERIC_PROMPT_SELECTORS.filter((s) => s !== "textarea" && s !== 'div[contenteditable="true"]'),
    ],
    responseSelectors: [
      "main [role=\"article\"]",
      "main article",
      '[role="article"]',
      ...GENERIC_RESPONSE_SELECTORS,
    ],
  },
  { id: "mistral",     label: "Mistral Le Chat",    type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["chat.mistral.ai"] },
  { id: "meta-ai",     label: "Meta AI",            type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["meta.ai"] },
  { id: "poe",         label: "Poe",                type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["poe.com"] },
  { id: "deepseek",    label: "DeepSeek",           type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["chat.deepseek.com"] },
  { id: "grok",        label: "Grok",               type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["grok.com"] },
  { id: "openrouter",  label: "OpenRouter",         type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["openrouter.ai"] },

  // ── Social media — text DLP + image moderation ───────────────────────────
  // Text in the post composer is analysed before submission (WARN/ANONYMIZE flow).
  // Images are moderated on file-input change / paste.
  {
    id: "twitter", label: "X / Twitter", type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["twitter.com", "x.com"],
    promptSelectors: [
      'div[data-testid="tweetTextarea_0"]',
      'div[data-testid="tweetTextarea_0RichTextInputContainer"]',
      ...SOCIAL_PROMPT_SELECTORS,
    ],
    sendButtonSelectors: [
      'button[data-testid="tweetButton"]',
      'button[data-testid="tweetButtonInline"]',
      ...SOCIAL_SEND_BUTTON_SELECTORS,
    ],
    sendButtonPatterns: SOCIAL_SEND_BUTTON_PATTERNS,
    responseSelectors: [],
  },
  {
    id: "instagram", label: "Instagram", type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["instagram.com"],
    promptSelectors: ['textarea[aria-label*="caption" i]', ...SOCIAL_PROMPT_SELECTORS],
    sendButtonSelectors: ['button[type="submit"]', ...SOCIAL_SEND_BUTTON_SELECTORS],
    sendButtonPatterns: SOCIAL_SEND_BUTTON_PATTERNS,
    responseSelectors: [],
  },
  {
    id: "linkedin", label: "LinkedIn", type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["linkedin.com"],
    promptSelectors: [
      'div.ql-editor[contenteditable="true"]',
      'div[role="textbox"]',
      ...SOCIAL_PROMPT_SELECTORS,
    ],
    sendButtonSelectors: [
      'button.share-actions__primary-action',
      'button[aria-label*="Post" i]',
      ...SOCIAL_SEND_BUTTON_SELECTORS,
    ],
    sendButtonPatterns: SOCIAL_SEND_BUTTON_PATTERNS,
    responseSelectors: [],
  },
  {
    id: "facebook", label: "Facebook", type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["facebook.com", "fb.com"],
    promptSelectors: [
      'div[role="textbox"][contenteditable="true"]',
      ...SOCIAL_PROMPT_SELECTORS,
    ],
    sendButtonSelectors: [
      'div[aria-label="Post"]', 'div[aria-label="Publier"]',
      'button[aria-label*="Post" i]', 'button[aria-label*="Publier" i]',
      ...SOCIAL_SEND_BUTTON_SELECTORS,
    ],
    sendButtonPatterns: SOCIAL_SEND_BUTTON_PATTERNS,
    responseSelectors: [],
  },
  {
    id: "tiktok", label: "TikTok", type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["tiktok.com"],
    promptSelectors: ['div[contenteditable="true"]', 'textarea', ...SOCIAL_PROMPT_SELECTORS],
    sendButtonSelectors: SOCIAL_SEND_BUTTON_SELECTORS,
    sendButtonPatterns: SOCIAL_SEND_BUTTON_PATTERNS,
    responseSelectors: [],
  },
  {
    id: "discord", label: "Discord", type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["discord.com"],
    promptSelectors: [
      'div[data-slate-editor="true"]',
      'div[role="textbox"]',
      ...SOCIAL_PROMPT_SELECTORS,
    ],
    sendButtonSelectors: [
      'button[aria-label*="Send Message" i]',
      ...SOCIAL_SEND_BUTTON_SELECTORS,
    ],
    sendButtonPatterns: SOCIAL_SEND_BUTTON_PATTERNS,
    responseSelectors: [],
  },
  {
    id: "reddit", label: "Reddit", type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["reddit.com"],
    promptSelectors: [
      'div[data-click-id="text"] div[contenteditable="true"]',
      'textarea[name="text"]',
      ...SOCIAL_PROMPT_SELECTORS,
    ],
    sendButtonSelectors: [
      'button[data-click-id="text"]',
      'button[aria-label*="Post" i]',
      ...SOCIAL_SEND_BUTTON_SELECTORS,
    ],
    sendButtonPatterns: SOCIAL_SEND_BUTTON_PATTERNS,
    responseSelectors: [],
  },
  {
    id: "telegram", label: "Telegram Web", type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["web.telegram.org"],
    promptSelectors: ['div[contenteditable="true"]', ...SOCIAL_PROMPT_SELECTORS],
    sendButtonSelectors: ['button[aria-label*="Send" i]', ...SOCIAL_SEND_BUTTON_SELECTORS],
    sendButtonPatterns: SOCIAL_SEND_BUTTON_PATTERNS,
    responseSelectors: [],
  },
  {
    id: "github",
    label: "GitHub",
    type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["github.com"],
    promptSelectors: CODE_HOST_PROMPT_SELECTORS,
    sendButtonSelectors: [...GENERIC_SEND_BUTTON_SELECTORS, ...SOCIAL_SEND_BUTTON_SELECTORS],
    sendButtonPatterns: [...GENERIC_SEND_BUTTON_PATTERNS, ...SOCIAL_SEND_BUTTON_PATTERNS],
    responseSelectors: GENERIC_RESPONSE_SELECTORS,
  },
  {
    id: "gitlab",
    label: "GitLab",
    type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["gitlab.com", "gitlab.org"],
    promptSelectors: CODE_HOST_PROMPT_SELECTORS,
    sendButtonSelectors: [...GENERIC_SEND_BUTTON_SELECTORS, ...SOCIAL_SEND_BUTTON_SELECTORS],
    sendButtonPatterns: [...GENERIC_SEND_BUTTON_PATTERNS, ...SOCIAL_SEND_BUTTON_PATTERNS],
    responseSelectors: GENERIC_RESPONSE_SELECTORS,
  },
  {
    id: "bitbucket",
    label: "Bitbucket",
    type: "social",
    features: ["textAnalysis", "imageModeration"],
    domains: ["bitbucket.org"],
    promptSelectors: CODE_HOST_PROMPT_SELECTORS,
    sendButtonSelectors: [...GENERIC_SEND_BUTTON_SELECTORS, ...SOCIAL_SEND_BUTTON_SELECTORS],
    sendButtonPatterns: [...GENERIC_SEND_BUTTON_PATTERNS, ...SOCIAL_SEND_BUTTON_PATTERNS],
    responseSelectors: GENERIC_RESPONSE_SELECTORS,
  },
];

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

/** Path for matching: no trailing slash except "/". */
function normalizePathname(path) {
  let p = String(path || "/");
  if (p !== "/" && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

/**
 * Parse options input: domain-only → whole host; URL with path → path-prefix scope.
 * @returns {{ ok: true, host: string, pathPrefix: string | null, display: string } | { ok: false, error: string }}
 */
function parseUserSiteInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return { ok: false, error: "empty" };
  let url;
  try {
    url = /^https?:\/\//i.test(s) ? new URL(s) : new URL(`https://${s}`);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (!url.hostname) return { ok: false, error: "invalid" };
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  let path = url.pathname || "/";
  if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
  const pathPrefix = path === "/" ? null : normalizePathname(path);
  const display = pathPrefix ? `${host}${pathPrefix}` : host;
  return { ok: true, host, pathPrefix, display };
}

function pathPrefixMatchesPage(pathname, prefix) {
  const p = normalizePathname(pathname);
  const pref = normalizePathname(prefix);
  if (pref === "/") return true;
  return p === pref || p.startsWith(`${pref}/`);
}

/**
 * @param {{ domain: string, pathPrefix?: string | null }} entry
 * @param {string} normalizedHost hostname already normalized
 * @param {string} pathname location.pathname
 */
function userAddedEntryMatchesPage(entry, normalizedHost, pathname) {
  const ruleHost = normalizeDomain(entry.domain);
  if (!ruleHost || !hostMatchesDomain(normalizedHost, ruleHost)) return false;
  const prefix = entry.pathPrefix;
  if (prefix == null || prefix === "") {
    return true;
  }
  return pathPrefixMatchesPage(pathname, prefix);
}

function hostMatchesDomain(hostname, domain) {
  const host = normalizeDomain(hostname);
  const d = normalizeDomain(domain);
  return !!d && (host === d || host.endsWith(`.${d}`));
}

function buildPlatformConfig(seed) {
  return {
    id: seed.id,
    label: seed.label,
    type: seed.type || "ai",
    features: seed.features || ["textAnalysis"],
    domains: seed.domains || [],
    sendButtonPatterns: seed.sendButtonPatterns || GENERIC_SEND_BUTTON_PATTERNS,
    sendButtonSelectors: seed.sendButtonSelectors || GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: seed.promptSelectors || GENERIC_PROMPT_SELECTORS,
    responseSelectors: seed.responseSelectors || GENERIC_RESPONSE_SELECTORS,
  };
}

const SITE_CONFIGS = PLATFORM_SEED.map(buildPlatformConfig);

function buildCustomConfig(domain) {
  const normalized = normalizeDomain(domain);
  return {
    id: `custom:${normalized}`,
    label: `Custom (${normalized})`,
    type: "custom",
    features: ["textAnalysis", "imageModeration"],
    domains: [normalized],
    sendButtonPatterns: GENERIC_SEND_BUTTON_PATTERNS,
    sendButtonSelectors: GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: GENERIC_PROMPT_SELECTORS,
    responseSelectors: GENERIC_RESPONSE_SELECTORS,
  };
}

/**
 * When the hostname matches no seeded or user rule, still activate the extension
 * for response-side AVS (universalFallback). Prompt send interception and image
 * moderation are skipped on these hosts in the content script to avoid hooking
 * every form on the open web.
 */
function buildUniversalFallbackConfig(hostname) {
  const h = normalizeDomain(hostname) || "unknown";
  return {
    id: `universal:${h}`,
    label: h,
    type: "universal",
    universalFallback: true,
    features: ["textAnalysis", "imageModeration"],
    domains: [h],
    sendButtonPatterns: GENERIC_SEND_BUTTON_PATTERNS,
    sendButtonSelectors: GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: GENERIC_PROMPT_SELECTORS,
    responseSelectors: GENERIC_RESPONSE_SELECTORS,
  };
}

/**
 * Build a config from a user-added platform entry (server-synced, per-user).
 * @param {{ id: string, label: string, domain: string, features: string[] }} entry
 */
function buildUserAddedConfig(entry) {
  const normalized = normalizeDomain(entry.domain);
  const pathSuffix = entry.pathPrefix ? String(entry.pathPrefix) : "";
  const labelBase = pathSuffix ? `${normalized}${pathSuffix}` : normalized;
  return {
    id: `user:${entry.id}`,
    label: entry.label || labelBase,
    type: "custom",
    features: Array.isArray(entry.features) ? entry.features : ["textAnalysis", "imageModeration"],
    domains: [normalized],
    sendButtonPatterns: GENERIC_SEND_BUTTON_PATTERNS,
    sendButtonSelectors: GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: GENERIC_PROMPT_SELECTORS,
    responseSelectors: GENERIC_RESPONSE_SELECTORS,
  };
}

function getDefaultEnabledPlatformIds() {
  return SITE_CONFIGS.map((cfg) => cfg.id);
}

/**
 * @param {string | { hostname: string, pathname?: string, href?: string }} page
 *        Legacy: hostname string only (path-scoped user rules are not applied).
 */
function resolveCurrentSiteConfig(page, userSettings = {}) {
  const guardrailEnabled = userSettings.guardrailEnabled !== false;
  if (!guardrailEnabled) return null;

  const hostname = typeof page === "string" ? page : page.hostname || "";
  const pathname = typeof page === "string" ? "/" : normalizePathname(page.pathname != null ? page.pathname : "/");

  // Empty enabledPlatformIds → treat as "all built-in platforms enabled" (opt-out model).
  const enabledIds = Array.isArray(userSettings.enabledPlatformIds) && userSettings.enabledPlatformIds.length > 0
    ? userSettings.enabledPlatformIds
    : getDefaultEnabledPlatformIds();
  const customDomains = Array.isArray(userSettings.customDomains) ? userSettings.customDomains : [];
  const userAddedPlatforms = Array.isArray(userSettings.userAddedPlatforms)
    ? userSettings.userAddedPlatforms
    : [];
  const normalizedHost = normalizeDomain(hostname);

  // 1. Built-in platforms (AI + Social seed).
  for (const cfg of SITE_CONFIGS) {
    if (!enabledIds.includes(cfg.id)) continue;
    if ((cfg.domains || []).some((domain) => hostMatchesDomain(normalizedHost, domain))) {
      return cfg;
    }
  }

  // 2. User-added platforms — longest pathPrefix first so specific rules beat host-only.
  const userSorted = [...userAddedPlatforms].sort((a, b) => {
    const la = (a.pathPrefix || "").length;
    const lb = (b.pathPrefix || "").length;
    return lb - la;
  });
  for (const entry of userSorted) {
    if (!entry.domain) continue;
    if (typeof page === "string") {
      if (hostMatchesDomain(normalizedHost, entry.domain) && !(entry.pathPrefix && String(entry.pathPrefix))) {
        return buildUserAddedConfig(entry);
      }
      continue;
    }
    if (userAddedEntryMatchesPage(entry, normalizedHost, pathname)) {
      return buildUserAddedConfig(entry);
    }
  }

  // 3. Legacy custom domains (kept for backward compatibility).
  for (const domain of customDomains) {
    if (hostMatchesDomain(normalizedHost, domain)) {
      return buildCustomConfig(domain);
    }
  }

  // 4. Any other web host — still run AVS on assistant-like content (see universalFallback).
  if (!normalizedHost) return null;
  return buildUniversalFallbackConfig(normalizedHost);
}

window.ConfidentialAgentSiteConfigs = {
  SITE_CONFIGS,
  resolveCurrentSiteConfig,
  getDefaultEnabledPlatformIds,
  buildUserAddedConfig,
  buildUniversalFallbackConfig,
  normalizeDomain,
  parseUserSiteInput,
};
