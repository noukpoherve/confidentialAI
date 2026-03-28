import Link from "next/link";
import { getDictionary } from "../../../../lib/i18n";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const a = dict.auth;
  const prefix = `/${locale}`;

  return (
    <div className="w-full max-w-md rounded-3xl border border-sky-200/80 bg-white p-8 shadow-lg shadow-sky-100/50">
      <h1 className="text-2xl font-bold text-slate-900">{a.loginTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">{a.loginSubtitle}</p>
      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {a.email}
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {a.password}
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            autoComplete="current-password"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          {a.submitLogin}
        </button>
      </div>
      <div className="mt-6 space-y-2">
        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {a.oauthGoogle}
        </button>
        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {a.oauthGithub}
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href={`${prefix}/register`} className="font-semibold text-sky-700 hover:underline">
          {dict.nav.register}
        </Link>
      </p>
    </div>
  );
}
