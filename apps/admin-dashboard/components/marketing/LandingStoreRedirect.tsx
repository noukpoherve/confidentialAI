"use client";

import { useEffect } from "react";

import { detectBrowserKind } from "../../lib/browser-detect";
import { getExtensionRedirectUrl } from "../../lib/extension-links";

const STORAGE_KEY = "ca_landing_store_redirect_done";

/**
 * On first visit to the marketing home, sends the user to the extension store
 * that matches their browser (Chrome Web Store for Chromium, /download#… for Firefox/Safari fallbacks).
 * Skips when ?noredirect=1 is present or after a redirect in this tab session (sessionStorage).
 */
export function LandingStoreRedirect({ locale }: { locale: string }) {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("noredirect") === "1") return;
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    const kind = detectBrowserKind();
    const url = getExtensionRedirectUrl(kind, locale, window.location.origin);

    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore private mode */
    }

    window.location.replace(url);
  }, [locale]);

  return null;
}
