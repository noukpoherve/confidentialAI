import { DashboardShell } from "../../../components/dashboard/DashboardShell";
import { getDictionary } from "../../../lib/i18n";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <DashboardShell locale={locale} dict={dict}>
      {children}
    </DashboardShell>
  );
}
