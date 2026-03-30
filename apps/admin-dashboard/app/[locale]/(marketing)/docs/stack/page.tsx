import { Pill } from "../../../../../components/ui/Pill";
import { getDictionary } from "../../../../../lib/i18n";

export default async function DocsStackPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  const d = dict.docs;

  const cardCls = "rounded-2xl border border-accent/20 bg-accent-soft/40 p-5";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{d.stackTitle}</h1>
      <p className="text-sm text-ink-muted">{d.stackIntro}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={cardCls}>
          <Pill tone="violet">MongoDB</Pill>
          <h2 className="mt-3 font-semibold text-ink">{d.stackMongoTitle}</h2>
          <p className="mt-2 text-sm text-ink-muted">{d.stackMongoBody}</p>
        </div>
        <div className={cardCls}>
          <Pill tone="violet">Qdrant</Pill>
          <h2 className="mt-3 font-semibold text-ink">{d.stackQdrantTitle}</h2>
          <p className="mt-2 text-sm text-ink-muted">{d.stackQdrantBody}</p>
        </div>
        <div className={cardCls}>
          <Pill tone="violet">embeddings</Pill>
          <h2 className="mt-3 font-semibold text-ink">{d.stackEmbedTitle}</h2>
          <p className="mt-2 text-sm text-ink-muted">{d.stackEmbedBody}</p>
        </div>
      </div>
    </div>
  );
}
