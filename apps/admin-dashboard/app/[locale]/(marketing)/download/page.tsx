import { ExtensionDownloadGrid } from "../../../../components/marketing/ExtensionDownloadGrid";
import { getDictionary } from "../../../../lib/i18n";

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  const d = dict.download;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-emerald-200/70 bg-[#F0FDF4] p-8 sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{d.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{d.subtitle}</p>
        <div className="mt-8">
          <ExtensionDownloadGrid dict={dict} />
        </div>
      </div>
    </div>
  );
}
