import Link from "next/link";
import { getDictionary } from "../../../../lib/i18n";

export default async function DocsHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const d = dict.docs;
  const prefix = `/${locale}`;

  return (
    <div className="prose prose-slate max-w-none">
      <h1 className="text-2xl font-bold text-slate-900">{d.title}</h1>
      <p className="text-slate-600">{d.intro}</p>
      <p className="text-slate-600">{d.installApi}</p>
      <p className="mt-6">
        <Link href={prefix} className="font-semibold text-emerald-700 hover:underline">
          {d.linkHome}
        </Link>
      </p>
    </div>
  );
}
