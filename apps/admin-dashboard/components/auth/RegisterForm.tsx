"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "../../lib/api";
import { setAuth } from "../../lib/auth-client";

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

interface Labels {
  email: string;
  password: string;
  submit: string;
}

export function RegisterForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await registerUser(email, password);
      setAuth(accessToken, user);
      router.push(`/${locale}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {labels.email}
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          autoComplete="email"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {labels.password}
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          autoComplete="new-password"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-canvas hover:bg-ink-muted disabled:opacity-60"
      >
        {loading ? "…" : labels.submit}
      </button>
    </form>
  );
}
