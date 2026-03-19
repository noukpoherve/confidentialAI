/**
 * Minimal per-platform detection rules.
 * Prioritize robust, evolvable heuristics.
 */

const SITE_CONFIGS = [
  {
    id: "chatgpt",
    hostRegex: /(^|\.)chatgpt\.com$/,
    sendButtonPatterns: [/send/i],
    sendButtonSelectors: [
      'button[data-testid="send-button"]',
      'button[data-testid*="send"]',
      'button[type="submit"]',
      'form button[type="submit"]',
      'button[aria-label*="Send message" i]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Envoyer" i]',
    ],
    promptSelectors: [
      '#prompt-textarea',
      'textarea[data-id="root"]',
      'textarea[placeholder*="Message" i]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
      'div[contenteditable="true"][role="textbox"]',
    ],
  },
  {
    id: "claude",
    hostRegex: /(^|\.)claude\.ai$/,
    sendButtonPatterns: [/send/i, /submit/i],
    sendButtonSelectors: ['button[aria-label*="Send" i]', 'button[aria-label*="Submit" i]'],
    promptSelectors: ['div[contenteditable="true"]', 'textarea'],
  },
  {
    id: "gemini",
    hostRegex: /(^|\.)gemini\.google\.com$/,
    sendButtonPatterns: [/send/i, /run/i, /ask/i],
    sendButtonSelectors: ['button[aria-label*="Send" i]', 'button[aria-label*="Run" i]'],
    promptSelectors: ['textarea', 'div[contenteditable="true"]'],
  },
];

function resolveCurrentSiteConfig(hostname) {
  return SITE_CONFIGS.find((cfg) => cfg.hostRegex.test(hostname)) || null;
}

window.ConfidentialAgentSiteConfigs = {
  SITE_CONFIGS,
  resolveCurrentSiteConfig,
};
