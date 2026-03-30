"use client";

import { useState } from "react";
import type { Dictionary } from "../../lib/i18n";
import { Pill } from "../ui/Pill";

export function PricingSection({ dict }: { dict: Dictionary }) {
  const p = dict.pricing;
  const [yearly, setYearly] = useState(false);

  const tiers = [
    {
      name: p.tierFree,
      price: yearly ? "0" : "0",
      suffix: yearly ? p.perYear : p.perMonth,
      cta: p.cta,
      featured: false,
      rows: [`3 ${p.fUsers}`, `10k ${p.fApiCalls}`, `7d ${p.fIncidents}`, p.fSupport + ": community"],
    },
    {
      name: p.tierPro,
      price: yearly ? "79" : "9",
      suffix: yearly ? p.perYear : p.perMonth,
      cta: p.cta,
      featured: true,
      rows: [`25 ${p.fUsers}`, `500k ${p.fApiCalls}`, `90d ${p.fIncidents}`, `Priority ${p.fSupport}`],
    },
    {
      name: p.tierEnterprise,
      price: yearly ? "—" : "—",
      suffix: "",
      cta: p.ctaContact,
      featured: false,
      rows: [`∞ ${p.fUsers}`, `${p.fApiCalls} (custom)`, `1y+ ${p.fIncidents}`, p.fSso],
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="amber">{p.badgeStripe}</Pill>
            <Pill tone="emerald">{p.badgeI18n}</Pill>
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink">{p.title}</h1>
          <p className="mt-2 max-w-xl text-base text-ink-muted">{p.subtitle}</p>
        </div>
        {/* Toggle */}
        <div className="inline-flex shrink-0 self-start rounded-full border border-line bg-canvas p-1 shadow-sm sm:self-auto">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              !yearly
                ? "bg-gradient-to-r from-accent to-[#7c7cff] text-white shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {p.toggleMonthly}
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              yearly
                ? "bg-gradient-to-r from-accent to-[#7c7cff] text-white shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {p.toggleYearly}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-stretch">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-2xl border bg-canvas p-7 transition ${
              tier.featured
                ? "border-accent/40 shadow-[0_0_0_1px_rgba(92,92,255,0.2),0_20px_60px_-20px_rgba(92,92,255,0.25)] lg:-my-3 lg:py-10"
                : "border-line shadow-sm hover:shadow-md"
            }`}
          >
            {tier.featured && (
              <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
            )}
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">{tier.name}</h2>
            <p className="mt-5 flex items-baseline gap-1">
              {tier.price !== "—" && (
                <span className="text-[0.875rem] font-semibold text-ink-muted">$</span>
              )}
              <span className="text-5xl font-bold tracking-tight text-ink">{tier.price}</span>
              {tier.suffix ? <span className="ml-1 text-sm text-ink-muted">{tier.suffix}</span> : null}
            </p>
            <ul className="mt-8 flex-1 space-y-3 text-sm">
              {tier.rows.map((row) => (
                <li key={row} className="flex items-start gap-2.5 text-ink-muted">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                  >
                    <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeOpacity="0.25" />
                    <path
                      d="m5.5 8 1.75 1.75L10.5 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {row}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition ${
                tier.featured
                  ? "bg-gradient-to-r from-accent to-[#7c7cff] text-white shadow-lg shadow-accent/25 hover:-translate-y-px hover:shadow-accent/40"
                  : "border border-line bg-canvas text-ink hover:bg-surface hover:shadow-sm"
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
