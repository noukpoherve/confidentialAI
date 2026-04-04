"use client";

import type { ReactNode } from "react";

import { detectBrowserKind } from "../../lib/browser-detect";
import { getExtensionRedirectUrl } from "../../lib/extension-links";

/**
 * Primary CTA: sends the user to the store or download page that matches their browser
 * (Chrome Web Store for Chromium, /download#… for Firefox/Safari fallbacks).
 */
export function GetExtensionCtaButton({
  locale,
  children,
  className,
}: {
  locale: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const url = getExtensionRedirectUrl(detectBrowserKind(), locale, window.location.origin);
        window.location.assign(url);
      }}
    >
      {children}
    </button>
  );
}
