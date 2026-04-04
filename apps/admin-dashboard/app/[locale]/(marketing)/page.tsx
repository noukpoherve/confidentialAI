import type { Metadata } from "next";
import { LandingExperience } from "../../../components/marketing/LandingExperience";
import { LandingStoreRedirect } from "../../../components/marketing/LandingStoreRedirect";
import { getDictionary } from "../../../lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const p = dict.landingPage;
  return {
    title: p.metaTitle,
    description: p.metaDescription,
  };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <>
      <LandingStoreRedirect locale={locale} />
      <LandingExperience locale={locale} dict={dict} />
    </>
  );
}
