import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";

export const metadata: Metadata = {
  title: "Confidential Agent Dashboard",
  description: "Security incidents and policy overview",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: "/", label: "Overview" },
    { href: "/incidents", label: "Incidents" },
    { href: "/site-health", label: "Site Health" },
  ];

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-4 px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Confidential Agent Dashboard</h1>
              <p className="mt-1 text-xs text-slate-500">
                Security monitoring, incidents, and platform reliability
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
