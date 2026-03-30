import Image from "next/image";
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
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={prefix}
          aria-label={dict.brand}
          className="group flex shrink-0 items-center rounded-2xl outline-offset-4 transition hover:opacity-[0.92]"
        >
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.08)] sm:h-12 sm:w-12">
            <Image
              src="/brand/logo.png"
              alt=""
              width={160}
              height={160}
              className="h-[85%] w-[85%] object-contain"
              priority
            />
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          <Link
            href={`${prefix}/download`}
            className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
          >
            {n.download}
          </Link>
          <Link
            href={`${prefix}/docs`}
            className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
          >
            {n.docs}
          </Link>
          <Link
            href={`${prefix}/pricing`}
            className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
          >
            {n.pricing}
          </Link>
          <Link
            href={`${prefix}/login`}
            className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
          >
            {n.login}
          </Link>
          <Link
            href={`${prefix}/register`}
            className="rounded-full bg-gradient-to-r from-accent to-[#7c7cff] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent/30 transition hover:-translate-y-px hover:shadow-accent/50"
          >
            {n.register}
          </Link>
          <LanguageSelect ariaLabel={dict.footer.language} />
        </nav>
      </div>
    </header>
  );
}
