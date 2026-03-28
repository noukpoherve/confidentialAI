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

  const linkCls = "text-sm font-medium text-stone-600 transition hover:text-stone-950";

  return (
    <footer className="mt-auto border-t-2 border-stone-900 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="lg:col-span-2">
            <p className="text-xl font-extrabold tracking-tight text-stone-950">{dict.brand}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-500">
              © {year} {dict.brand}. {f.rights}
            </p>
            <div className="mt-6">
              <LanguageSelect ariaLabel={f.language} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">{f.groupProduct}</p>
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
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">{f.groupResources}</p>
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
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">{f.groupAccount}</p>
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
