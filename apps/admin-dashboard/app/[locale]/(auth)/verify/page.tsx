import Link from "next/link";
import { getDictionary } from "../../../../lib/i18n";

export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const a = dict.auth;
  const prefix = `/${locale}`;

  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-canvas p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">{a.verifyTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{a.verifySubtitle}</p>
      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {a.token}
          </label>
          <input
            type="text"
            className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            placeholder="••••••"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-canvas hover:bg-ink-muted"
        >
          {a.submitVerify}
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href={`${prefix}/login`} className="font-semibold text-accent hover:underline">
          {dict.nav.login}
        </Link>
      </p>
    </div>
  );
}
