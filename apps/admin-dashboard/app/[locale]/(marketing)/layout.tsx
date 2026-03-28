import { DM_Sans, Fraunces } from "next/font/google";
import { MarketingFooter } from "../../../components/marketing/MarketingFooter";
import { MarketingNav } from "../../../components/marketing/MarketingNav";
import { getDictionary } from "../../../lib/i18n";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

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
    <div
      className={`${dmSans.variable} ${fraunces.variable} flex min-h-screen flex-col bg-white font-sans text-stone-900 antialiased`}
    >
      <MarketingNav locale={locale} dict={dict} />
      <div className="flex-1">{children}</div>
      <MarketingFooter locale={locale} dict={dict} />
    </div>
  );
}
