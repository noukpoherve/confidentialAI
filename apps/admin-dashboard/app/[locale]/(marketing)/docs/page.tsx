import Link from "next/link";
import { getDictionary } from "../../../../lib/i18n";

export default async function DocsHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const d = dict.docs;
  const prefix = `/${locale}`;

  return (
    <div className="prose prose-neutral max-w-none">
      <h1 className="text-2xl font-bold text-ink">{d.title}</h1>
      <p className="text-ink-muted">{d.intro}</p>
      <p className="text-ink-muted">{d.installApi}</p>
      <p className="mt-6">
        <Link href={prefix} className="font-semibold text-accent hover:underline">
          {d.linkHome}
        </Link>
      </p>
    </div>
  );
}
