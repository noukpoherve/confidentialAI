/**
 * Platform seed and host-resolution utilities.
 * This lets users enable/disable platforms and add custom domains in extension options.
 */

const GENERIC_SEND_BUTTON_PATTERNS = [
  /send/i,
  /submit/i,
  /ask/i,
  /run/i,
  /post/i,
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
  'button[aria-label*="Envoyer" i]',
  'button[aria-label*="Publier" i]',
];
const GENERIC_PROMPT_SELECTORS = ['textarea', 'div[contenteditable="true"]', 'input[type="text"]'];
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
  /publier/i, /partager/i, /envoyer/i,
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
      'div[data-message-author-role="assistant"] .markdown',
      'div[data-message-author-role="assistant"]',
      'article[data-testid*="conversation-turn"] .markdown',
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
    promptSelectors: ['div[contenteditable="true"]', 'textarea'],
    responseSelectors: ['div[data-testid*="assistant"]', 'main [role="article"]', 'main .prose'],
  },
  {
    id: "gemini",
    label: "Gemini",
    type: "ai",
    features: ["textAnalysis", "imageModeration"],
    domains: ["gemini.google.com"],
    sendButtonPatterns: [/send/i, /run/i, /ask/i],
    sendButtonSelectors: GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: ['textarea', 'div[contenteditable="true"]'],
    responseSelectors: ['message-content', '[data-test-id*="response"]', 'main article'],
  },
  { id: "copilot",     label: "Microsoft Copilot", type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["copilot.microsoft.com"] },
  { id: "perplexity",  label: "Perplexity",         type: "ai", features: ["textAnalysis", "imageModeration"], domains: ["perplexity.ai"] },
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
];

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
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
    type: "ai",
    features: ["textAnalysis", "imageModeration"],
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

function resolveCurrentSiteConfig(hostname, userSettings = {}) {
  const guardrailEnabled = userSettings.guardrailEnabled !== false;
  if (!guardrailEnabled) return null;

  const enabledIds = Array.isArray(userSettings.enabledPlatformIds)
    ? userSettings.enabledPlatformIds
    : getDefaultEnabledPlatformIds();
  const customDomains = Array.isArray(userSettings.customDomains) ? userSettings.customDomains : [];
  const normalizedHost = normalizeDomain(hostname);

  for (const cfg of SITE_CONFIGS) {
    if (!enabledIds.includes(cfg.id)) continue;
    if ((cfg.domains || []).some((domain) => hostMatchesDomain(normalizedHost, domain))) {
      return cfg;
    }
  }

  for (const domain of customDomains) {
    if (hostMatchesDomain(normalizedHost, domain)) {
      return buildCustomConfig(domain);
    }
  }

  return null;
}

window.ConfidentialAgentSiteConfigs = {
  SITE_CONFIGS,
  resolveCurrentSiteConfig,
  getDefaultEnabledPlatformIds,
  normalizeDomain,
};
