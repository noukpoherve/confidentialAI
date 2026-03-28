import { getDictionary } from "../../../../lib/i18n";
import { Pill } from "../../../../components/ui/Pill";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">{dict.dashboard.navSettings}</h2>
        <Pill tone="rose">RBAC</Pill>
        <Pill tone="rose">2FA</Pill>
        <Pill tone="neutral">webhook</Pill>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        <p>{dict.dashboard.settingsPlaceholder}</p>
      </div>
    </section>
  );
}
