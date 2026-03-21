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

const PLATFORM_SEED = [
  {
    id: "chatgpt",
    label: "ChatGPT",
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
    domains: ["claude.ai"],
    sendButtonPatterns: [/send/i, /submit/i],
    sendButtonSelectors: GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: ['div[contenteditable="true"]', 'textarea'],
    responseSelectors: ['div[data-testid*="assistant"]', 'main [role="article"]', 'main .prose'],
  },
  {
    id: "gemini",
    label: "Gemini",
    domains: ["gemini.google.com"],
    sendButtonPatterns: [/send/i, /run/i, /ask/i],
    sendButtonSelectors: GENERIC_SEND_BUTTON_SELECTORS,
    promptSelectors: ['textarea', 'div[contenteditable="true"]'],
    responseSelectors: ['message-content', '[data-test-id*="response"]', 'main article'],
  },
  { id: "copilot", label: "Microsoft Copilot", domains: ["copilot.microsoft.com"] },
  { id: "perplexity", label: "Perplexity", domains: ["perplexity.ai"] },
  { id: "mistral", label: "Mistral Le Chat", domains: ["chat.mistral.ai"] },
  { id: "meta-ai", label: "Meta AI", domains: ["meta.ai"] },
  { id: "poe", label: "Poe", domains: ["poe.com"] },
  { id: "deepseek", label: "DeepSeek", domains: ["chat.deepseek.com"] },
  { id: "grok", label: "Grok", domains: ["grok.com", "x.com"] },
  { id: "openrouter", label: "OpenRouter", domains: ["openrouter.ai"] },
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
