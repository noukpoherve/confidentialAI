import Link from "next/link";
import { ProductMap } from "../../../../components/marketing/ProductMap";
import { getDictionary } from "../../../../lib/i18n";

export default async function PlatformMapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const prefix = `/${locale}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm text-stone-500">
        <Link href={prefix} className="font-medium text-emerald-800 hover:underline">
          ← {dict.brand}
        </Link>
      </p>
      <div className="mt-8">
        <ProductMap locale={locale} dict={dict} />
      </div>
    </div>
  );
}
