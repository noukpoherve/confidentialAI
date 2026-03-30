import Link from "next/link";
import { getDictionary } from "../../../../lib/i18n";

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const a = dict.auth;
  const prefix = `/${locale}`;

  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-canvas p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">{a.loginTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{a.loginSubtitle}</p>
      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {a.email}
          </label>
          <input type="email" className={inputCls} autoComplete="email" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {a.password}
          </label>
          <input type="password" className={inputCls} autoComplete="current-password" />
        </div>
        <button
          type="button"
          className="w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-canvas hover:bg-ink-muted"
        >
          {a.submitLogin}
        </button>
      </div>
      <div className="mt-6 space-y-2">
        <button
          type="button"
          className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink-muted hover:bg-surface"
        >
          {a.oauthGoogle}
        </button>
        <button
          type="button"
          className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink-muted hover:bg-surface"
        >
          {a.oauthGithub}
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href={`${prefix}/register`} className="font-semibold text-accent hover:underline">
          {dict.nav.register}
        </Link>
      </p>
    </div>
  );
}
