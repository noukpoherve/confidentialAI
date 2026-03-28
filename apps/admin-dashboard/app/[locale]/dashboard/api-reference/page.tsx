import Link from "next/link";
import { getDictionary } from "../../../../lib/i18n";
import { Pill } from "../../../../components/ui/Pill";

export default async function ApiReferencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">{dict.dashboard.navApiRef}</h2>
        <Pill tone="sky">OpenAPI</Pill>
        <Pill tone="violet">interactive</Pill>
      </div>
      <div className="rounded-3xl border border-sky-200/80 bg-[#EFF6FF]/50 p-8 text-sm text-slate-700">
        <p>{dict.dashboard.apiRefPlaceholder}</p>
        <p className="mt-4">
          <Link
            href={`http://localhost:8080/docs`}
            className="font-semibold text-sky-700 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            FastAPI /docs (local) →
          </Link>
        </p>
      </div>
    </section>
  );
}
