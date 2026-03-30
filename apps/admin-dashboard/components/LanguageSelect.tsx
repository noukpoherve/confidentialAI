"use client";

import { usePathname, useRouter } from "next/navigation";

const locales = [
  { code: "en" as const, flag: "🇬🇧", label: "English" },
  { code: "fr" as const, flag: "🇫🇷", label: "Français" },
];

export function LanguageSelect({ ariaLabel }: { ariaLabel: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = pathname.startsWith("/fr") ? "fr" : "en";

  return (
    <select
      aria-label={ariaLabel}
      value={current}
      onChange={(e) => {
        const next = e.target.value;
        const rest = pathname.replace(/^\/(en|fr)/, "") || "";
        router.push(`/${next}${rest}`);
      }}
      className="cursor-pointer rounded-lg border border-line bg-canvas py-2.5 pl-3 pr-10 text-sm font-semibold text-ink shadow-sm outline-none transition hover:border-accent/40 focus:border-accent focus:ring-2 focus:ring-accent/25"
    >
      {locales.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
