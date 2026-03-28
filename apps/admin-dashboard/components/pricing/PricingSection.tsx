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
    <div className="rounded-3xl border border-emerald-200/70 bg-[#F0FDF4] p-6 sm:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="amber">{p.badgeStripe}</Pill>
            <Pill tone="emerald">{p.badgeI18n}</Pill>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{p.title}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">{p.subtitle}</p>
        </div>
        <div className="inline-flex rounded-full border border-emerald-200/80 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              !yearly ? "bg-emerald-600 text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {p.toggleMonthly}
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              yearly ? "bg-emerald-600 text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {p.toggleYearly}
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
              tier.featured ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200/80"
            }`}
          >
            <h2 className="text-lg font-bold text-slate-900">{tier.name}</h2>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-slate-900">{tier.price}</span>
              {tier.suffix ? <span className="text-sm text-slate-500">{tier.suffix}</span> : null}
            </p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-600">
              {tier.rows.map((row) => (
                <li key={row} className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  {row}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition ${
                tier.featured
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
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
