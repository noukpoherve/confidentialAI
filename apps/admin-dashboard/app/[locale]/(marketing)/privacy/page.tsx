import type { Metadata } from "next";
import { PrivacyContent } from "../../../../components/marketing/PrivacyContent";
import { getDictionary } from "../../../../lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const pr = dict.privacy;
  return {
    title: pr.metaTitle,
    description: pr.metaDescription,
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);

  return <PrivacyContent dict={dict} />;
}
