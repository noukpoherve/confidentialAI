import Link from "next/link";
import type { Dictionary } from "../../lib/i18n";
import { Pill } from "../ui/Pill";

type Card = {
  title: string;
  desc: string;
  tags: { label: string; tone: "emerald" | "sky" | "violet" | "amber" | "rose" | "neutral" }[];
  href?: string;
};

export function ProductMap({
  locale,
  dict,
}: {
  locale: string;
  dict: Dictionary;
}) {
  const p = dict.productMap;
  const prefix = `/${locale}`;

  const publicCards: Card[] = [
    {
      title: p.cardLandingTitle,
      desc: p.cardLandingDesc,
      tags: [
        { label: "i18n", tone: "emerald" },
        { label: "SEO", tone: "emerald" },
        { label: p.tagAnimations, tone: "emerald" },
      ],
      href: prefix,
    },
    {
      title: p.cardDownloadTitle,
      desc: p.cardDownloadDesc,
      tags: [
        { label: "Chrome", tone: "neutral" },
        { label: "Firefox", tone: "neutral" },
        { label: "Edge", tone: "neutral" },
      ],
      href: `${prefix}/download`,
    },
    {
      title: p.cardPricingTitle,
      desc: p.cardPricingDesc,
      tags: [
        { label: "Stripe", tone: "amber" },
        { label: p.tagMonthlyYearly, tone: "neutral" },
        { label: "i18n", tone: "emerald" },
      ],
      href: `${prefix}/pricing`,
    },
    {
      title: p.cardDocsTitle,
      desc: p.cardDocsDesc,
      tags: [
        { label: "MDX", tone: "violet" },
        { label: "sidebar", tone: "neutral" },
        { label: "search", tone: "neutral" },
      ],
      href: `${prefix}/docs`,
    },
    {
      title: p.cardBlogTitle,
      desc: p.cardBlogDesc,
      tags: [
        { label: "MDX", tone: "violet" },
        { label: "SEO", tone: "emerald" },
      ],
      href: `${prefix}/blog`,
    },
    {
      title: p.cardChangelogTitle,
      desc: p.cardChangelogDesc,
      tags: [{ label: "MDX", tone: "violet" }],
      href: `${prefix}/changelog`,
    },
  ];

  const authCards: Card[] = [
    {
      title: p.cardLoginTitle,
      desc: p.cardLoginDesc,
      tags: [
        { label: "NextAuth", tone: "sky" },
        { label: "OAuth", tone: "sky" },
      ],
      href: `${prefix}/login`,
    },
    {
      title: p.cardSignupTitle,
      desc: p.cardSignupDesc,
      tags: [
        { label: "NextAuth", tone: "sky" },
        { label: p.tagEmailVerify, tone: "amber" },
      ],
      href: `${prefix}/register`,
    },
    {
      title: p.cardVerifyTitle,
      desc: p.cardVerifyDesc,
      tags: [{ label: "JWT", tone: "rose" }],
      href: `${prefix}/verify`,
    },
  ];

  const dashCards: Card[] = [
    {
      title: p.cardDashHomeTitle,
      desc: p.cardDashHomeDesc,
      tags: [
        { label: "charts", tone: "violet" },
        { label: "real-time", tone: "violet" },
      ],
      href: `${prefix}/dashboard`,
    },
    {
      title: p.cardApiKeysTitle,
      desc: p.cardApiKeysDesc,
      tags: [
        { label: "CRUD", tone: "violet" },
        { label: "rotation", tone: "amber" },
        { label: "scopes", tone: "neutral" },
      ],
      href: `${prefix}/dashboard/api-keys`,
    },
    {
      title: p.cardUsageTitle,
      desc: p.cardUsageDesc,
      tags: [
        { label: "charts", tone: "violet" },
        { label: "CSV", tone: "neutral" },
      ],
      href: `${prefix}/dashboard/usage`,
    },
    {
      title: p.cardIncidentsTitle,
      desc: p.cardIncidentsDesc,
      tags: [
        { label: "filters", tone: "neutral" },
        { label: "graphTrace", tone: "emerald" },
      ],
      href: `${prefix}/dashboard/incidents`,
    },
    {
      title: p.cardBillingTitle,
      desc: p.cardBillingDesc,
      tags: [
        { label: "Stripe", tone: "amber" },
        { label: "portal", tone: "sky" },
      ],
      href: `${prefix}/dashboard/billing`,
    },
    {
      title: p.cardSettingsTitle,
      desc: p.cardSettingsDesc,
      tags: [
        { label: "RBAC", tone: "rose" },
        { label: "2FA", tone: "rose" },
        { label: "webhook", tone: "neutral" },
      ],
      href: `${prefix}/dashboard/settings`,
    },
    {
      title: p.cardIntegratedDocsTitle,
      desc: p.cardIntegratedDocsDesc,
      tags: [
        { label: "OpenAPI", tone: "sky" },
        { label: "interactive", tone: "violet" },
      ],
      href: `${prefix}/dashboard/api-reference`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{p.title}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-ink-muted">{p.subtitle}</p>
      </div>

      <Layer tone="emerald" title={p.layerPublic} cards={publicCards} />
      <Layer tone="sky" title={p.layerAuth} cards={authCards} />
      <Layer tone="violet" title={p.layerDashboard} cards={dashCards} />
    </div>
  );
}

function Layer({
  tone,
  title,
  cards,
}: {
  tone: "emerald" | "sky" | "violet";
  title: string;
  cards: Card[];
}) {
  const shell: Record<string, string> = {
    emerald: "border-line bg-surface",
    sky: "border-accent/25 bg-accent-soft/50",
    violet: "border-accent/30 bg-accent-soft/70",
  };

  return (
    <section className={`rounded-3xl border p-5 sm:p-7 ${shell[tone]}`}>
      <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const inner = (
            <>
              <h4 className="text-base font-semibold text-ink">{c.title}</h4>
              <p className="mt-1 text-sm text-ink-muted">{c.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <Pill key={t.label} tone={t.tone}>
                    {t.label}
                  </Pill>
                ))}
              </div>
            </>
          );
          if (c.href) {
            return (
              <Link
                key={c.title}
                href={c.href}
                className="block rounded-2xl border border-line bg-canvas p-4 shadow-sm transition hover:border-accent/30 hover:shadow-md"
              >
                {inner}
              </Link>
            );
          }
          return (
            <div key={c.title} className="rounded-2xl border border-line bg-canvas p-4 shadow-sm">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
