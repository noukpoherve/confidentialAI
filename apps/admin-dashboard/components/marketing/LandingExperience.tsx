import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "../../lib/i18n";
import { ExtensionDownloadGrid } from "./ExtensionDownloadGrid";

const IMG = {
  hero: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=82",
  solve: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&q=82",
};

function PeopleCardIcon({ kind }: { kind: "shield" | "users" | "chat" }) {
  const common = "h-9 w-9";
  if (kind === "shield") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (kind === "users") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        />
        <circle cx="9" cy="7" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      />
    </svg>
  );
}

export function LandingExperience({
  locale,
  dict,
}: {
  locale: string;
  dict: Dictionary;
}) {
  const p = dict.landingPage;
  const l = dict.landing;
  const prefix = `/${locale}`;
  const platforms = [p.plat1, p.plat2, p.plat3, p.plat4, p.plat5, p.plat6] as const;

  return (
    <div className="bg-white">
      {/* Hero — expressive, high-contrast (inspired by product-led SaaS landings) */}
      <section className="relative overflow-hidden border-b-2 border-stone-900 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,#ecfdf5_0%,rgba(255,255,255,0)_42%),radial-gradient(90%_60%_at_100%_0%,rgba(167,139,250,0.12),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-emerald-600">
              {p.heroKicker}
            </p>
            <h1 className="mt-4 font-sans text-4xl font-extrabold leading-[1.05] tracking-tight text-stone-950 sm:text-5xl md:text-[3.25rem] lg:text-[3.5rem]">
              <span className="block">{p.heroLine1}</span>
              <span className="mt-1 block text-emerald-600">{p.heroLine2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-bold leading-snug text-stone-900 sm:text-xl">
              {p.heroPunch}
            </p>
            {p.heroLead.trim() ? (
              <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">{p.heroLead}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${prefix}/download`}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-3.5 text-sm font-extrabold text-white shadow-[0_4px_0_0_rgb(6,78,59)] transition hover:translate-y-0.5 hover:bg-emerald-700 hover:shadow-none"
              >
                {p.heroCtaPrimary}
              </Link>
              <Link
                href={`${prefix}/pricing`}
                className="inline-flex items-center justify-center rounded-full border-2 border-stone-900 bg-white px-8 py-3.5 text-sm font-extrabold text-stone-900 transition hover:bg-stone-50"
              >
                {p.heroCtaSecondary}
              </Link>
            </div>
            <p className="mt-6 max-w-md text-sm font-medium text-stone-500">{p.heroNote}</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[p.stat1, p.stat2, p.stat3].map((s) => (
                <div
                  key={s}
                  className="rounded-xl border-2 border-stone-200 bg-stone-50 px-3 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-stone-800"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border-2 border-stone-900 bg-stone-100 shadow-[12px_12px_0_0_rgba(16,185,129,0.35)]">
              <Image
                src={IMG.hero}
                alt={p.imageHeroAlt}
                width={1400}
                height={1050}
                className="h-auto w-full object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bento — social · AI · youth (high-impact SaaS block) */}
      <section className="relative overflow-hidden border-b-2 border-stone-900 bg-stone-950 py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(52,211,153,0.25),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(167,139,250,0.2),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">
              {p.stripTitle}
            </h2>
            {p.stripSub.trim() ? (
              <p className="mx-auto mt-3 max-w-2xl text-sm font-medium text-stone-400 sm:text-base">{p.stripSub}</p>
            ) : null}
          </div>

          <div className="mt-12 grid auto-rows-fr gap-4 sm:gap-5 lg:grid-cols-12 lg:grid-rows-2">
            <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[1.75rem] border-2 border-white/10 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 p-8 text-white shadow-[10px_10px_0_0_rgba(255,255,255,0.12)] lg:col-span-7 lg:row-span-2 lg:min-h-0">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-black/20 blur-3xl" />
              <div className="relative">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-white/80">
                  {p.bentoEyebrowSocial}
                </p>
                <h3 className="mt-3 font-sans text-2xl font-extrabold leading-tight sm:text-3xl">{p.socialBentoTitle}</h3>
                <p className="mt-3 max-w-md text-sm font-medium leading-snug text-white/90">{p.socialBentoLine}</p>
              </div>
              <div className="relative mt-8 flex flex-wrap gap-2">
                {platforms.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-white/25 bg-black/15 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white backdrop-blur-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[1.75rem] border-2 border-stone-900 bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-800 p-7 text-stone-950 shadow-[8px_8px_0_0_rgb(12,10,9)] lg:col-span-5 lg:min-h-[200px]">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-stone-900/70">
                  {p.bentoEyebrowAi}
                </p>
                <h3 className="mt-2 font-sans text-xl font-extrabold sm:text-2xl">{p.aiBentoTitle}</h3>
                <p className="mt-2 text-sm font-semibold leading-snug text-stone-900/90">{p.aiBentoLine}</p>
              </div>
              <p className="mt-6 font-mono text-[11px] font-bold leading-relaxed text-stone-900/80">{p.bentoApiTeaser}</p>
            </div>

            <div className="flex flex-col justify-between rounded-[1.75rem] border-2 border-stone-900 bg-gradient-to-br from-sky-200 via-rose-100 to-amber-100 p-7 text-stone-900 shadow-[8px_8px_0_0_rgb(12,10,9)] lg:col-span-5 lg:min-h-[200px]">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-rose-900/60">
                  {p.bentoEyebrowYouth}
                </p>
                <h3 className="mt-2 font-sans text-xl font-extrabold sm:text-2xl">{p.minorBentoTitle}</h3>
                <p className="mt-2 text-sm font-semibold leading-snug text-stone-800">{p.minorBentoLine}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-lg border-2 border-stone-900 bg-white px-3 py-1.5 text-xs font-extrabold">
                  {p.minorChipVulgarity}
                </span>
                <span className="rounded-lg border-2 border-stone-900 bg-white px-3 py-1.5 text-xs font-extrabold">
                  {p.minorChipHarassment}
                </span>
                <span className="rounded-lg border-2 border-stone-900 bg-amber-200 px-3 py-1.5 text-xs font-extrabold">
                  {p.minorChipAge}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All-in-one feature grid */}
      <section className="border-b-2 border-stone-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-sans text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">
            {p.bandTitle}
          </h2>
          {p.bandLead.trim() ? (
            <p className="mx-auto mt-3 max-w-2xl text-center text-base font-medium text-stone-600">{p.bandLead}</p>
          ) : null}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [p.feat1Title, p.feat1Body, "from-violet-500/15 to-fuchsia-500/10 border-violet-300/40"],
                [p.feat2Title, p.feat2Body, "from-emerald-500/15 to-teal-500/10 border-emerald-300/40"],
                [p.feat3Title, p.feat3Body, "from-rose-500/15 to-amber-500/10 border-rose-300/40"],
                [p.feat4Title, p.feat4Body, "from-sky-500/15 to-indigo-500/10 border-sky-300/40"],
              ] as const
            ).map(([title, body, grad]) => (
              <div
                key={title}
                className={`rounded-2xl border-2 bg-gradient-to-br p-6 transition hover:-translate-y-0.5 hover:shadow-lg ${grad}`}
              >
                <h3 className="text-lg font-extrabold text-stone-950">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-700">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — numbered steps */}
      <section className="border-b-2 border-stone-900 bg-stone-950 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-sans text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {p.hwTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-lg font-medium text-stone-400">{p.hwLead}</p>
          <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
            {(
              [
                ["01", p.hw1Title, p.hw1Body],
                ["02", p.hw2Title, p.hw2Body],
                ["03", p.hw3Title, p.hw3Body],
              ] as const
            ).map(([num, title, body]) => (
              <div key={num} className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
                <span className="font-sans text-5xl font-extrabold leading-none text-emerald-400 md:text-6xl">
                  {num}
                </span>
                <h3 className="mt-4 text-xl font-extrabold text-white">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-stone-400">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link
              href={`${prefix}/download`}
              className="inline-flex rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-extrabold text-stone-950 transition hover:bg-emerald-400"
            >
              {p.heroCtaPrimary}
            </Link>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-stone-900 sm:text-4xl">{p.problemTitle}</h2>
          {p.problemLead.trim() ? (
            <p className="mt-4 text-base leading-relaxed text-stone-600">{p.problemLead}</p>
          ) : null}
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {(
            [
              [p.risk1Title, p.risk1Body, "border-l-emerald-500 bg-gradient-to-br from-emerald-50/90 to-white"],
              [p.risk2Title, p.risk2Body, "border-l-violet-500 bg-gradient-to-br from-violet-50/90 to-white"],
              [p.risk3Title, p.risk3Body, "border-l-rose-500 bg-gradient-to-br from-rose-50/90 to-white"],
              [p.risk4Title, p.risk4Body, "border-l-amber-500 bg-gradient-to-br from-amber-50/90 to-white"],
            ] as const
          ).map(([title, body, cardCls]) => (
            <div
              key={title}
              className={`flex flex-col rounded-3xl border border-stone-200/80 border-l-4 bg-white p-8 shadow-lg shadow-stone-900/5 ${cardCls}`}
            >
              <h3 className="font-serif text-xl font-semibold text-stone-900">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-700">{body}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Solution + image */}
      <section className="border-y border-stone-200 bg-stone-100/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="order-2 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm lg:order-1">
            <Image
              src={IMG.solve}
              alt={p.imageSolveAlt}
              width={1400}
              height={1050}
              className="h-full w-full object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-800/90">{p.solveEyebrow}</p>
            <h2 className="mt-3 font-serif text-3xl font-medium text-stone-900 sm:text-4xl">{p.solveTitle}</h2>
            {p.solveLead.trim() ? (
              <p className="mt-4 text-base leading-relaxed text-stone-600">{p.solveLead}</p>
            ) : null}
            <ul className="mt-8 space-y-4 text-sm text-stone-700">
              {[p.solve1, p.solve2, p.solve3].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Product UI demos */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{p.demoEyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl font-medium text-stone-900 sm:text-4xl">{p.demoTitle}</h2>
          {p.demoLead.trim() ? <p className="mt-4 text-base text-stone-600">{p.demoLead}</p> : null}
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <article className="rounded-3xl border-2 border-red-200/90 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(185,28,28,0.35)] sm:p-8">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">{p.blockedTitle}</h3>
                <p className="text-xs text-stone-500">{p.blockedSub}</p>
              </div>
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white"
                aria-hidden
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </header>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                {p.blockedBadge1}
              </span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                {p.blockedBadge2}
              </span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                {p.blockedBadge3}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-stone-600">{p.blockedRisk}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="h-full w-full rounded-full bg-red-500" />
            </div>
            <p className="mt-4 text-sm text-stone-600">{p.blockedMsg}</p>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {p.blockedPreviewLabel}
            </p>
            <div className="mt-2 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 font-mono text-xs leading-relaxed text-stone-800">
              {p.blockedPreview}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700"
              >
                {p.blockedHide}
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                {p.blockedSend}
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50"
              >
                {p.blockedCancel}
              </button>
            </div>
          </article>

          <article className="rounded-3xl border border-violet-200/90 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(109,40,217,0.25)] sm:p-8">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">{p.toneTitle}</h3>
              <p className="text-xs text-stone-500">{p.toneSub}</p>
            </header>
            <div className="mt-4 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900">
              {p.toneBadge}
            </div>
            <p className="mt-4 text-sm text-stone-600">{p.toneMsg}</p>
            <div className="mt-6 space-y-3">
              {[p.toneAlt1, p.toneAlt2, p.toneAlt3].map((alt) => (
                <div
                  key={alt}
                  className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 text-sm leading-relaxed text-stone-800"
                >
                  <p>{alt}</p>
                  <button
                    type="button"
                    className="mt-3 text-xs font-semibold text-violet-700 hover:text-violet-900"
                  >
                    {p.toneUse} ✓
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-6">
              <button
                type="button"
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700"
              >
                {p.toneEdit}
              </button>
              <button type="button" className="rounded-xl px-4 py-2 text-xs font-semibold text-red-600">
                {p.toneSendOrig}
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50"
              >
                {p.toneCancel}
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* People — high-contrast cards, no stock photos */}
      <section className="relative overflow-hidden border-t-2 border-stone-900 bg-stone-950 py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/25 blur-[90px]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-rose-500/15 blur-[80px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-emerald-400/90">{p.peopleKicker}</p>
            <h2 className="mt-4 font-sans text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
              {p.peopleTitle}
            </h2>
            {p.peopleLead.trim() ? (
              <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-relaxed text-stone-400">{p.peopleLead}</p>
            ) : null}
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-5 lg:items-stretch">
            {(
              [
                {
                  featured: false,
                  icon: "shield" as const,
                  grad: "from-emerald-500 to-teal-600",
                  ring: "ring-white/10",
                  eyebrow: p.people1Eyebrow,
                  title: p.people1Title,
                  body: p.people1Body,
                  chips: [p.people1Chip1, p.people1Chip2],
                },
                {
                  featured: true,
                  icon: "users" as const,
                  grad: "from-rose-500 via-fuchsia-600 to-violet-600",
                  ring: "ring-rose-400/70",
                  eyebrow: p.people2Eyebrow,
                  title: p.people2Title,
                  body: p.people2Body,
                  chips: [p.people2Chip1, p.people2Chip2],
                },
                {
                  featured: false,
                  icon: "chat" as const,
                  grad: "from-violet-500 to-indigo-600",
                  ring: "ring-white/10",
                  eyebrow: p.people3Eyebrow,
                  title: p.people3Title,
                  body: p.people3Body,
                  chips: [p.people3Chip1, p.people3Chip2],
                },
              ] as const
            ).map((card) => (
              <article
                key={card.title}
                className={`group relative flex flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 shadow-xl backdrop-blur-sm transition duration-300 hover:border-white/20 hover:bg-white/[0.07] ${
                  card.featured
                    ? `z-[1] shadow-[0_0_0_1px_rgba(251,113,133,0.35),0_24px_80px_-24px_rgba(244,63,94,0.45)] ring-2 ${card.ring} lg:-my-2 lg:scale-[1.02] lg:py-10`
                    : `ring-1 ${card.ring}`
                }`}
              >
                {card.featured ? (
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-rose-400/80 to-transparent" />
                ) : null}
                <div
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.grad} text-white shadow-lg transition group-hover:scale-105 group-hover:shadow-xl`}
                >
                  <PeopleCardIcon kind={card.icon} />
                </div>
                <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.22em] text-stone-500">{card.eyebrow}</p>
                <h3 className="mt-2 font-sans text-2xl font-extrabold text-white">{card.title}</h3>
                <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-stone-400">{card.body}</p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {card.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-stone-200"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & code */}
      <section className="relative overflow-hidden border-t border-emerald-200/60 py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_30%,rgba(16,185,129,0.14),transparent),radial-gradient(60%_50%_at_85%_70%,rgba(109,40,217,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-800">{p.privacyEyebrow}</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-stone-900 sm:text-4xl">{p.privacyTitle}</h2>
            <p className="mt-4 text-base leading-relaxed text-stone-700">{p.privacyLead}</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {(
              [
                [p.privacy1Title, p.privacy1Body, "from-emerald-500 to-teal-600"],
                [p.privacy2Title, p.privacy2Body, "from-violet-500 to-indigo-600"],
                [p.privacy3Title, p.privacy3Body, "from-amber-500 to-orange-600"],
              ] as const
            ).map(([title, body, grad]) => (
              <div
                key={title}
                className={`rounded-3xl bg-gradient-to-br p-[2px] shadow-xl shadow-stone-900/10 ${grad}`}
              >
                <div className="h-full rounded-[22px] bg-white p-7">
                  <h3 className="font-serif text-lg font-semibold text-stone-900">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone-700">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture teaser */}
      <section className="border-t border-stone-200 bg-gradient-to-b from-violet-50/50 to-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border-2 border-violet-200/70 bg-gradient-to-br from-white to-violet-50/40 p-8 shadow-lg shadow-violet-200/40 sm:p-10">
            <h2 className="font-serif text-2xl font-semibold text-stone-900 sm:text-3xl">{p.archTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-700 sm:text-base">{p.archLead}</p>
            <Link
              href={`${prefix}/docs/stack`}
              className="mt-6 inline-flex text-sm font-bold text-violet-800 underline-offset-4 hover:underline"
            >
              {p.archLink} →
            </Link>
          </div>
        </div>
      </section>

      {/* Install */}
      <section className="border-t border-stone-200 bg-emerald-50/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-medium text-stone-900 sm:text-3xl">{l.installTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">{l.installSubtitle}</p>
          <div className="mt-8">
            <ExtensionDownloadGrid dict={dict} />
          </div>
        </div>
      </section>

      <section
        id="developer-install"
        className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6"
      >
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
          <h2 className="font-serif text-2xl font-medium text-stone-900">{l.associateTitle}</h2>
          <p className="mt-2 text-sm text-stone-600">{l.associateSubtitle}</p>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-stone-700">
            <li>{l.associateStep1}</li>
            <li>{l.associateStep2}</li>
            <li>{l.associateStep3}</li>
          </ol>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-stone-200 bg-stone-900 px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-3xl font-medium text-white sm:text-4xl">{p.ctaBandTitle}</h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-300 sm:text-base">{p.ctaBandLead}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`${prefix}/download`}
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-100"
            >
              {p.ctaBandPrimary}
            </Link>
            <Link
              href={`${prefix}/pricing`}
              className="inline-flex rounded-full border border-stone-600 px-6 py-3 text-sm font-semibold text-white hover:border-stone-400"
            >
              {p.ctaBandSecondary}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
