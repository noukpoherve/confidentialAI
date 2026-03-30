import { getDictionary } from "../../../../lib/i18n";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  const b = dict.blog;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-line bg-surface p-8">
        <h1 className="text-3xl font-bold text-ink">{b.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{b.subtitle}</p>
        <p className="mt-8 rounded-2xl border border-dashed border-accent/30 bg-canvas p-6 text-sm text-ink-muted">
          {b.empty}
        </p>
      </div>
    </div>
  );
}
