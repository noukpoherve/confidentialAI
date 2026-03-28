"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "../../lib/i18n";

const items = [
  { suffix: "/dashboard", key: "navOverview" as const },
  { suffix: "/dashboard/api-keys", key: "navApiKeys" as const },
  { suffix: "/dashboard/usage", key: "navUsage" as const },
  { suffix: "/dashboard/incidents", key: "navIncidents" as const },
  { suffix: "/dashboard/site-health", key: "navSiteHealth" as const },
  { suffix: "/dashboard/billing", key: "navBilling" as const },
  { suffix: "/dashboard/settings", key: "navSettings" as const },
  { suffix: "/dashboard/api-reference", key: "navApiRef" as const },
];

export function MobileDashboardNav({ locale, dict }: { locale: string; dict: Dictionary }) {
  const pathname = usePathname();
  const d = dict.dashboard;

  return (
    <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {items.map(({ suffix, key }) => {
        const href = `/${locale}${suffix}`;
        const active =
          suffix === "/dashboard"
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            key={suffix}
            href={href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {d[key]}
          </Link>
        );
      })}
    </nav>
  );
}
