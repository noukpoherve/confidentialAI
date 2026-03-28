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
      className="cursor-pointer rounded-lg border-2 border-stone-900 bg-white py-2.5 pl-3 pr-10 text-sm font-bold text-stone-900 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)] outline-none transition hover:border-emerald-600 hover:shadow-[4px_4px_0_0_rgba(16,185,129,0.35)] focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
    >
      {locales.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
