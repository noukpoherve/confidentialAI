import { getDictionary } from "../../../../lib/i18n";

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  const c = dict.changelog;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-emerald-200/60 bg-[#F0FDF4] p-8">
        <h1 className="text-3xl font-bold text-slate-900">{c.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{c.subtitle}</p>
        <ul className="mt-8 space-y-4">
          <li className="rounded-2xl border border-white/80 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <span className="font-mono text-xs font-semibold text-emerald-700">0.1.0</span>
            <p className="mt-1">{c.v01}</p>
          </li>
        </ul>
      </div>
    </div>
  );
}
