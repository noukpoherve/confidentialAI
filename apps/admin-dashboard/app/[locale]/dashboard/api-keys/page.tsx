import { ApiKeysClient } from "../../../../components/dashboard/ApiKeysClient";
import { getDictionary } from "../../../../lib/i18n";

export default async function ApiKeysPage({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);

  return (
    <div className="rounded-3xl border border-violet-200/60 bg-[#F5F3FF]/30 p-6 shadow-sm sm:p-8">
      <ApiKeysClient dict={dict} />
    </div>
  );
}
