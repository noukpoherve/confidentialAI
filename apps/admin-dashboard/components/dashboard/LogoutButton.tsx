"use client";

import { useRouter } from "next/navigation";
import { clearAuth } from "../../lib/auth-client";

export function LogoutButton({ locale, label }: { locale: string; label: string }) {
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push(`/${locale}/login`);
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-canvas"
    >
      {label}
    </button>
  );
}
