import { getDictionary } from "../../../../lib/i18n";

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  const c = dict.changelog;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-line bg-surface p-8">
        <h1 className="text-3xl font-bold text-ink">{c.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{c.subtitle}</p>
        <ul className="mt-8 space-y-4">
          <li className="rounded-2xl border border-line bg-canvas p-4 text-sm text-ink-muted shadow-sm">
            <span className="font-mono text-xs font-semibold text-accent">0.1.0</span>
            <p className="mt-1">{c.v01}</p>
          </li>
        </ul>
      </div>
    </div>
  );
}
