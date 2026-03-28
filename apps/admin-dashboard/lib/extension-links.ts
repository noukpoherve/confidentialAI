/**
 * Single source of truth for store URLs and dev instructions.
 * Replace placeholder hrefs when extensions are published to each store.
 */
export type BrowserId = "chrome" | "edge" | "firefox" | "safari";

export const extensionLinks: Record<
  BrowserId,
  { labelKey: "chrome" | "edge" | "firefox" | "safari"; href: string; available: boolean; hint?: string }
> = {
  chrome: {
    labelKey: "chrome",
    href: "https://chromewebstore.google.com/",
    available: false,
    hint: "Use developer unpacked build until listed.",
  },
  edge: {
    labelKey: "edge",
    href: "https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home",
    available: false,
    hint: "Edge accepts unpacked MV3 similarly to Chrome during development.",
  },
  firefox: {
    labelKey: "firefox",
    href: "https://addons.mozilla.org/",
    available: false,
    hint: "Firefox MV3 packaging may differ; track in repo issues.",
  },
  safari: {
    labelKey: "safari",
    href: "https://developer.apple.com/safari/extensions/",
    available: false,
    hint: "Safari Web Extensions workflow is separate from Chromium.",
  },
};
