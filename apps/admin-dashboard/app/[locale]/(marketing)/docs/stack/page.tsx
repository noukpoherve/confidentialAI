import { Pill } from "../../../../../components/ui/Pill";
import { getDictionary } from "../../../../../lib/i18n";

export default async function DocsStackPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  const d = dict.docs;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{d.stackTitle}</h1>
      <p className="text-sm text-slate-600">{d.stackIntro}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-200/80 bg-[#F5F3FF]/60 p-5">
          <Pill tone="violet">MongoDB</Pill>
          <h2 className="mt-3 font-semibold text-slate-900">{d.stackMongoTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{d.stackMongoBody}</p>
        </div>
        <div className="rounded-2xl border border-violet-200/80 bg-[#F5F3FF]/60 p-5">
          <Pill tone="violet">Qdrant</Pill>
          <h2 className="mt-3 font-semibold text-slate-900">{d.stackQdrantTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{d.stackQdrantBody}</p>
        </div>
        <div className="rounded-2xl border border-violet-200/80 bg-[#F5F3FF]/60 p-5">
          <Pill tone="violet">embeddings</Pill>
          <h2 className="mt-3 font-semibold text-slate-900">{d.stackEmbedTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{d.stackEmbedBody}</p>
        </div>
      </div>
    </div>
  );
}
