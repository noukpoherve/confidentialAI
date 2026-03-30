import Link from "next/link";
import { getDictionary } from "../../../../lib/i18n";

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const d = dict.docs;
  const prefix = `/${locale}`;

  const links = [
    { href: `${prefix}/docs`, label: d.navOverview },
    { href: `${prefix}/docs/stack`, label: d.navStack },
    { href: `${prefix}/pricing`, label: d.linkPricing },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:px-6">
      <aside className="w-full shrink-0 sm:w-52">
        <div className="sticky top-24 space-y-4">
          <input
            type="search"
            placeholder={d.searchPlaceholder}
            disabled
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink-muted"
          />
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-ink-muted transition hover:bg-canvas hover:text-ink hover:shadow-sm"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1 rounded-3xl border border-line bg-canvas p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
