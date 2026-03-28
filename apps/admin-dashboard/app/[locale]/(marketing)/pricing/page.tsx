import { PricingSection } from "../../../../components/pricing/PricingSection";
import { getDictionary } from "../../../../lib/i18n";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PricingSection dict={dict} />
    </div>
  );
}
