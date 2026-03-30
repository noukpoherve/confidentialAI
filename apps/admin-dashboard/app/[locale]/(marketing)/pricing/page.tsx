import { PricingSection } from "../../../../components/pricing/PricingSection";
import { getDictionary } from "../../../../lib/i18n";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-line bg-canvas">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(92,92,255,0.07),transparent),radial-gradient(ellipse_40%_40%_at_85%_50%,rgba(0,230,118,0.05),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">Simple, transparent pricing</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-muted">No hidden fees. Cancel anytime.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <PricingSection dict={dict} />
      </div>
    </div>
  );
}
