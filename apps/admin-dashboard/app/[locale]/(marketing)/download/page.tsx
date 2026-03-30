import { ExtensionDownloadGrid } from "../../../../components/marketing/ExtensionDownloadGrid";
import { getDictionary } from "../../../../lib/i18n";

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  const d = dict.download;

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-line bg-canvas">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(92,92,255,0.08),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">{d.title}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">{d.subtitle}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-signal shadow-sm shadow-signal/50" aria-hidden />
            <p className="text-sm font-medium text-ink-muted">Chrome, Firefox, Edge, Safari</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ExtensionDownloadGrid dict={dict} />
      </div>
    </div>
  );
}
