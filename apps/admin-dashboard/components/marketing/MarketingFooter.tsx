import Link from "next/link";
import type { Dictionary } from "../../lib/i18n";
import { LanguageSelect } from "../LanguageSelect";

export function MarketingFooter({
  locale,
  dict,
}: {
  locale: string;
  dict: Dictionary;
}) {
  const prefix = `/${locale}`;
  const year = new Date().getFullYear();
  const n = dict.nav;
  const f = dict.footer;

  const linkCls = "text-sm font-medium text-ink-muted transition hover:text-ink";

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line bg-surface">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-gradient-to-br from-accent to-[#7c7cff] shadow-sm shadow-accent/50" aria-hidden />
              <p className="text-[13px] font-semibold tracking-[0.22em] text-ink">{dict.brand}</p>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              © {year} {dict.brand}. {f.rights}
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:border-ink/20 hover:bg-canvas hover:text-ink hover:shadow-sm"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:border-ink/20 hover:bg-canvas hover:text-ink hover:shadow-sm"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:border-ink/20 hover:bg-canvas hover:text-ink hover:shadow-sm"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
            <div className="mt-5">
              <LanguageSelect ariaLabel={f.language} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted/80">{f.groupProduct}</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link href={prefix} className={linkCls}>
                  {n.product}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/download`} className={linkCls}>
                  {n.download}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/download`} className={linkCls}>
                  {n.extensions}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/platform`} className={linkCls}>
                  {n.platformMap}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/dashboard`} className={linkCls}>
                  {n.dashboard}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted/80">{f.groupResources}</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link href={`${prefix}/docs`} className={linkCls}>
                  {n.docs}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/pricing`} className={linkCls}>
                  {n.pricing}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/blog`} className={linkCls}>
                  {n.blog}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/changelog`} className={linkCls}>
                  {n.changelog}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/privacy`} className={linkCls}>
                  {n.privacy}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted/80">{f.groupAccount}</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link href={`${prefix}/login`} className={linkCls}>
                  {n.login}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/register`} className={linkCls}>
                  {n.register}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
