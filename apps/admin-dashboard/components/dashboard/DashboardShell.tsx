import Link from "next/link";
import { cookies } from "next/headers";
import type { Dictionary } from "../../lib/i18n";
import { MobileDashboardNav } from "./MobileDashboardNav";
import { LogoutButton } from "./LogoutButton";

const navKeys = [
  { href: "/dashboard", key: "navOverview" as const },
  { href: "/dashboard/api-keys", key: "navApiKeys" as const },
  { href: "/dashboard/usage", key: "navUsage" as const },
  { href: "/dashboard/incidents", key: "navIncidents" as const },
  { href: "/dashboard/site-health", key: "navSiteHealth" as const },
  { href: "/dashboard/test-runner", key: "navTestRunner" as const },
  { href: "/dashboard/billing", key: "navBilling" as const },
  { href: "/dashboard/settings", key: "navSettings" as const },
  { href: "/dashboard/api-reference", key: "navApiRef" as const },
];

export async function DashboardShell({
  locale,
  dict,
  children,
}: {
  locale: string;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const prefix = `/${locale}`;
  const d = dict.dashboard;

  // Read user from cookie (set at login — available to server components via next/headers).
  const cookieStore = await cookies();
  const userRaw = cookieStore.get("ca_user")?.value;
  let userEmail = "you@company.com";
  let userInitial = "O";
  try {
    if (userRaw) {
      const user = JSON.parse(decodeURIComponent(userRaw)) as { email?: string };
      if (user.email) {
        userEmail = user.email;
        userInitial = user.email.charAt(0).toUpperCase();
      }
    }
  } catch {
    // fall through to defaults
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-ink text-white/80 lg:flex">
        <div className="border-b border-white/10 p-4">
          <Link href={`${prefix}/dashboard`} className="text-sm font-bold tracking-tight text-canvas">
            {dict.brand}
          </Link>
          <p className="mt-1 text-xs text-white/45">{d.project}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">{d.project}</p>
          {navKeys.map((item) => (
            <Link
              key={item.href}
              href={`${prefix}${item.href}`}
              className="rounded-lg px-2 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-canvas"
            >
              {d[item.key]}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="rounded-xl border border-white/15 bg-white/5 p-3">
            <p className="text-xs text-white/50">{d.credits}</p>
            <p className="mt-1 text-lg font-semibold text-canvas">$0.00</p>
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-accent py-1.5 text-xs font-semibold text-white hover:opacity-95"
            >
              {d.topUp}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-canvas">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-canvas">{userEmail}</p>
            </div>
          </div>
          <div className="mt-2">
            <LogoutButton locale={locale} label="Log out" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link href={`${prefix}/dashboard`} className="text-sm font-semibold text-ink lg:hidden">
              {dict.brand}
            </Link>
            <span className="hidden text-sm text-ink-muted/60 lg:inline">/</span>
            <span className="hidden truncate text-sm text-ink-muted lg:inline">
              {d.breadcrumbProject} / Default
            </span>
          </div>
          <Link
            href={prefix}
            className="shrink-0 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface"
          >
            {d.backHome}
          </Link>
        </header>
        <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 sm:px-6">
          {d.alertBanner}
        </div>
        <main className="flex-1 p-4 sm:p-6">
          <MobileDashboardNav locale={locale} dict={dict} />
          {children}
        </main>
      </div>
    </div>
  );
}
