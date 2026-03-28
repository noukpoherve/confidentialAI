import Link from "next/link";
import { getDictionary } from "../../../lib/i18n";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const prefix = `/${locale}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#EFF6FF] text-slate-900">
      <header className="border-b border-sky-200/80 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        <Link href={prefix} className="text-sm font-semibold text-slate-900">
          ← {dict.brand}
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">{children}</div>
    </div>
  );
}
