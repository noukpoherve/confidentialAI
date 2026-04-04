/**
 * Client-side browser detection for extension store redirects.
 */

export type BrowserKind =
  | "chrome"
  | "edge"
  | "firefox"
  | "safari"
  | "opera"
  | "brave"
  | "other";

export function detectBrowserKind(): BrowserKind {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/OPR\//.test(ua) || /Opera\//.test(ua)) return "opera";
  try {
    const brave = (navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } }).brave;
    if (/Brave\//.test(ua) || brave?.isBrave) return "brave";
  } catch {
    /* ignore */
  }
  if (/Chrome\//.test(ua) || /Chromium\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Android/.test(ua)) return "safari";
  return "other";
}
