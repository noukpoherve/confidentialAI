import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./styles.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Confidential Agent",
    template: "%s · Confidential Agent",
  },
  description: "DLP guardrail for generative AI — extension, API, and dashboard.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const locale = h.get("x-locale") ?? "en";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>{children}</body>
    </html>
  );
}
