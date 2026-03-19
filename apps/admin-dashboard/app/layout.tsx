import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";

export const metadata: Metadata = {
  title: "Confidential Agent Dashboard",
  description: "Security incidents and policy overview",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <h1>Confidential Agent Dashboard</h1>
          <nav>
            <Link href="/">Overview</Link>
            <Link href="/incidents">Incidents</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
