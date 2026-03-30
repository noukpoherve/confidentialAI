import { MarketingFooter } from "../../../components/marketing/MarketingFooter";
import { MarketingNav } from "../../../components/marketing/MarketingNav";
import { getDictionary } from "../../../lib/i18n";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
      <MarketingNav locale={locale} dict={dict} />
      <div className="flex-1">{children}</div>
      <MarketingFooter locale={locale} dict={dict} />
    </div>
  );
}
