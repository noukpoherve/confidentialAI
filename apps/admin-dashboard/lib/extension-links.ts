/**
 * Single source of truth for store URLs and dev instructions.
 */

import type { BrowserKind } from "./browser-detect";

export type BrowserId = "chrome" | "edge" | "firefox" | "safari";

/** Live listing — Confidential Agent Guardrail on Chrome Web Store */
export const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/confidential-agent-guardr/mfafgkpgcaaodbmmkpafacdblicapcjp";

export const extensionLinks: Record<
  BrowserId,
  { labelKey: "chrome" | "edge" | "firefox" | "safari"; href: string; available: boolean; hint?: string }
> = {
  chrome: {
    labelKey: "chrome",
    href: CHROME_WEB_STORE_URL,
    available: true,
    hint: undefined,
  },
  edge: {
    labelKey: "edge",
    href: CHROME_WEB_STORE_URL,
    available: true,
    hint: "Edge can install extensions from the Chrome Web Store (Allow extensions from other stores).",
  },
  firefox: {
    labelKey: "firefox",
    href: "https://addons.mozilla.org/firefox/extensions/",
    available: false,
    hint: "Firefox listing pending — use Chrome/Edge or the developer build below.",
  },
  safari: {
    labelKey: "safari",
    href: "https://developer.apple.com/safari/extensions/",
    available: false,
    hint: "Safari Web Extensions use a separate distribution path (Mac App Store).",
  },
};

/**
 * Where to send the user for a one-click install, given detected browser.
 * Chromium-based → Chrome Web Store (Edge/Opera/Brave use the same listing).
 * Firefox / Safari → optional env URLs, else localized /download# anchor.
 */
export function getExtensionRedirectUrl(kind: BrowserKind, locale: string, origin: string): string {
  const firefoxFromEnv = process.env.NEXT_PUBLIC_EXTENSION_URL_FIREFOX?.trim();
  const safariFromEnv = process.env.NEXT_PUBLIC_EXTENSION_URL_SAFARI?.trim();
  const download = `${origin}/${locale}/download`;

  switch (kind) {
    case "chrome":
    case "edge":
    case "opera":
    case "brave":
    case "other":
      return CHROME_WEB_STORE_URL;
    case "firefox":
      return firefoxFromEnv || `${download}#extension-firefox`;
    case "safari":
      return safariFromEnv || `${download}#extension-safari`;
    default:
      return CHROME_WEB_STORE_URL;
  }
}
