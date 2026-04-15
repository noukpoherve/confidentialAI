import Link from "next/link";
import { getDictionary } from "../../../../lib/i18n";
import { LoginForm } from "../../../../components/auth/LoginForm";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const a = dict.auth;
  const prefix = `/${locale}`;

  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-canvas p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">{a.loginTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{a.loginSubtitle}</p>

      <LoginForm
        locale={locale}
        labels={{ email: a.email, password: a.password, submit: a.submitLogin }}
      />

      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href={`${prefix}/register`} className="font-semibold text-accent hover:underline">
          {dict.nav.register}
        </Link>
      </p>
    </div>
  );
}
