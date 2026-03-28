import Link from "next/link";
import type { Dictionary } from "../../lib/i18n";
import { LanguageSelect } from "../LanguageSelect";

export function MarketingNav({
  locale,
  dict,
}: {
  locale: string;
  dict: Dictionary;
}) {
  const prefix = `/${locale}`;
  const n = dict.nav;

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-200/40 bg-gradient-to-b from-white via-emerald-50/30 to-white/95 shadow-[0_8px_30px_-12px_rgba(16,185,129,0.25)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Link
          href={prefix}
          className="bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-lg font-bold tracking-tight text-transparent"
        >
          {dict.brand}
        </Link>
        <nav className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <Link
            href={`${prefix}/download`}
            className="rounded-full px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-emerald-100/80 hover:text-emerald-950"
          >
            {n.download}
          </Link>
          <Link
            href={`${prefix}/docs`}
            className="rounded-full px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-emerald-100/80 hover:text-emerald-950"
          >
            {n.docs}
          </Link>
          <Link
            href={`${prefix}/pricing`}
            className="rounded-full px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-emerald-100/80 hover:text-emerald-950"
          >
            {n.pricing}
          </Link>
          <Link
            href={`${prefix}/login`}
            className="rounded-full px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-violet-50 hover:text-violet-900"
          >
            {n.login}
          </Link>
          <Link
            href={`${prefix}/register`}
            className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-700 hover:to-teal-700"
          >
            {n.register}
          </Link>
          <LanguageSelect ariaLabel={dict.footer.language} />
        </nav>
      </div>
    </header>
  );
}
