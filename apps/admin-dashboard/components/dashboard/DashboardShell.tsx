import Link from "next/link";
import type { Dictionary } from "../../lib/i18n";
import { MobileDashboardNav } from "./MobileDashboardNav";

const navKeys = [
  { href: "/dashboard", key: "navOverview" as const },
  { href: "/dashboard/api-keys", key: "navApiKeys" as const },
  { href: "/dashboard/usage", key: "navUsage" as const },
  { href: "/dashboard/incidents", key: "navIncidents" as const },
  { href: "/dashboard/site-health", key: "navSiteHealth" as const },
  { href: "/dashboard/billing", key: "navBilling" as const },
  { href: "/dashboard/settings", key: "navSettings" as const },
  { href: "/dashboard/api-reference", key: "navApiRef" as const },
];

export function DashboardShell({
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-300 lg:flex">
        <div className="border-b border-slate-800 p-4">
          <Link href={`${prefix}/dashboard`} className="text-sm font-bold tracking-tight text-white">
            {dict.brand}
          </Link>
          <p className="mt-1 text-xs text-slate-500">{d.project}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{d.project}</p>
          {navKeys.map((item) => (
            <Link
              key={item.href}
              href={`${prefix}${item.href}`}
              className="rounded-lg px-2 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {d[item.key]}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
            <p className="text-xs text-slate-400">{d.credits}</p>
            <p className="mt-1 text-lg font-semibold text-white">$0.00</p>
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              {d.topUp}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
              {d.user.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{d.user}</p>
              <p className="truncate text-xs text-slate-500">you@company.com</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href={`${prefix}/dashboard`}
              className="text-sm font-semibold text-slate-900 lg:hidden"
            >
              {dict.brand}
            </Link>
            <span className="hidden text-sm text-slate-400 lg:inline">/</span>
            <span className="hidden truncate text-sm text-slate-600 lg:inline">
              {d.breadcrumbProject} / Default
            </span>
          </div>
          <Link
            href={prefix}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {d.backHome}
          </Link>
        </header>
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:px-6">
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
