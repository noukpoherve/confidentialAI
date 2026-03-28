import { getDictionary } from "../../../../lib/i18n";
import { Pill } from "../../../../components/ui/Pill";

export default async function UsagePage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">{dict.dashboard.navUsage}</h2>
        <Pill tone="violet">CSV</Pill>
        <Pill tone="violet">charts</Pill>
      </div>
      <div className="rounded-3xl border border-violet-200/70 bg-[#F5F3FF]/40 p-8">
        <div className="flex justify-end gap-2 text-xs font-semibold">
          <span className="rounded-full bg-violet-600 px-3 py-1 text-white">API</span>
          <span className="rounded-full px-3 py-1 text-slate-600">Extension</span>
        </div>
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-300 bg-white/90 py-20 text-center">
          <p className="text-sm font-medium text-slate-700">{dict.dashboard.usageEmpty}</p>
          <p className="mt-2 max-w-md text-xs text-slate-400">
            Aggregate calls per API key and per platform; export when wired to telemetry.
          </p>
        </div>
      </div>
    </section>
  );
}
