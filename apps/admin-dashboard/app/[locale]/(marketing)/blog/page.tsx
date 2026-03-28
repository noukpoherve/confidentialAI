import { getDictionary } from "../../../../lib/i18n";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  const b = dict.blog;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-emerald-200/60 bg-[#F0FDF4] p-8">
        <h1 className="text-3xl font-bold text-slate-900">{b.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{b.subtitle}</p>
        <p className="mt-8 rounded-2xl border border-dashed border-emerald-300/80 bg-white/80 p-6 text-sm text-slate-500">
          {b.empty}
        </p>
      </div>
    </div>
  );
}
