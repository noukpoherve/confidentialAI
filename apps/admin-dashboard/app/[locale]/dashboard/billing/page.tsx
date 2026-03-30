import { getDictionary } from "../../../../lib/i18n";
import { Pill } from "../../../../components/ui/Pill";

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <h2 className="text-2xl font-semibold text-ink">{dict.dashboard.navBilling}</h2>
        <Pill tone="amber">Stripe</Pill>
        <Pill tone="sky">portal</Pill>
      </div>
      <div className="rounded-3xl border border-amber-200/70 bg-amber-50/40 p-8 text-sm text-amber-950">
        <p>{dict.dashboard.billingPlaceholder}</p>
      </div>
    </section>
  );
}
