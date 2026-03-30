import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "../../lib/i18n";
import { ExtensionDownloadGrid } from "./ExtensionDownloadGrid";

const IMG = {
  hero: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=82",
  solve: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&q=82",
};

function FeatureIcon({ index }: { index: number }) {
  const cls = "h-5 w-5";
  if (index === 0) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

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
    <div className="bg-canvas">
      {/* Hero — charte: noir / gris / accent #5C5CFF, surfaces #F2F2F2 */}
      <section className="relative overflow-hidden border-b border-line bg-canvas">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_0%_50%,rgba(92,92,255,0.10),transparent),radial-gradient(ellipse_60%_45%_at_105%_40%,rgba(0,230,118,0.06),transparent),radial-gradient(ellipse_80%_30%_at_50%_0%,rgba(92,92,255,0.06),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              {p.heroKicker}
            </p>
            <h1 className="mt-4 font-sans text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-[3.25rem] lg:text-[3.5rem]">
              <span className="block">{p.heroLine1}</span>
              <span className="mt-1 block text-accent">{p.heroLine2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold leading-snug text-ink sm:text-xl">
              {p.heroPunch}
            </p>
            {p.heroLead.trim() ? (
              <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">{p.heroLead}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${prefix}/download`}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-accent to-[#7c7cff] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:-translate-y-px hover:shadow-xl hover:shadow-accent/40"
              >
                {p.heroCtaPrimary}
              </Link>
              <Link
                href={`${prefix}/pricing`}
                className="inline-flex items-center justify-center rounded-full border border-line bg-canvas px-8 py-3.5 text-sm font-semibold text-ink shadow-sm transition hover:border-ink/20 hover:bg-surface hover:shadow-md"
              >
                {p.heroCtaSecondary}
              </Link>
            </div>
            <p className="mt-6 max-w-md text-sm font-medium text-ink-muted">{p.heroNote}</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[p.stat1, p.stat2, p.stat3].map((s) => (
                <div
                  key={s}
                  className="rounded-xl border border-line/80 bg-canvas px-3 py-3 text-center shadow-sm"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted/75">{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-line/60 bg-surface shadow-[0_32px_64px_-16px_rgba(92,92,255,0.18),0_0_0_1px_rgba(0,0,0,0.04)]">
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

      {/* Bento — tons neutres + accent, vert signal réservé aux détails */}
      <section className="relative overflow-hidden border-b border-line bg-ink py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(92,92,255,0.35),transparent),radial-gradient(ellipse_55%_40%_at_100%_50%,rgba(0,230,118,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans text-2xl font-bold tracking-tight text-canvas sm:text-3xl md:text-4xl">
              {p.stripTitle}
            </h2>
            {p.stripSub.trim() ? (
              <p className="mx-auto mt-3 max-w-2xl text-sm font-medium text-white/65 sm:text-base">{p.stripSub}</p>
            ) : null}
          </div>

          <div className="mt-12 grid auto-rows-fr gap-4 sm:gap-5 lg:grid-cols-12 lg:grid-rows-2">
            <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-accent to-[#4343cc] p-8 text-canvas shadow-[10px_10px_0_0_rgba(255,255,255,0.06)] lg:col-span-7 lg:row-span-2 lg:min-h-0">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-black/25 blur-3xl" />
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/85">
                  {p.bentoEyebrowSocial}
                </p>
                <h3 className="mt-3 font-sans text-2xl font-bold leading-tight sm:text-3xl">{p.socialBentoTitle}</h3>
                <p className="mt-3 max-w-md text-sm font-medium leading-snug text-white/92">{p.socialBentoLine}</p>
              </div>
              <div className="relative mt-8 flex flex-wrap gap-2">
                {platforms.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-white/25 bg-black/20 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-canvas backdrop-blur-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[1.75rem] border border-white/10 bg-surface p-7 text-ink shadow-[8px_8px_0_0_rgba(255,255,255,0.08)] lg:col-span-5 lg:min-h-[200px]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ink-muted">
                  {p.bentoEyebrowAi}
                </p>
                <h3 className="mt-2 font-sans text-xl font-bold sm:text-2xl">{p.aiBentoTitle}</h3>
                <p className="mt-2 text-sm font-medium leading-snug text-ink-muted">{p.aiBentoLine}</p>
              </div>
              <p className="mt-6 font-mono text-[11px] font-semibold leading-relaxed text-ink-muted">{p.bentoApiTeaser}</p>
            </div>

            <div className="flex flex-col justify-between rounded-[1.75rem] border border-white/10 bg-ink-muted/30 p-7 text-canvas shadow-[8px_8px_0_0_rgba(92,92,255,0.25)] lg:col-span-5 lg:min-h-[200px]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                  {p.bentoEyebrowYouth}
                </p>
                <h3 className="mt-2 font-sans text-xl font-bold sm:text-2xl">{p.minorBentoTitle}</h3>
                <p className="mt-2 text-sm font-medium leading-snug text-white/85">{p.minorBentoLine}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                  {p.minorChipVulgarity}
                </span>
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                  {p.minorChipHarassment}
                </span>
                <span className="rounded-xl border border-signal/40 bg-signal/15 px-3 py-1.5 text-xs font-semibold text-signal">
                  {p.minorChipAge}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All-in-one feature grid */}
      <section className="border-b border-line bg-canvas py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-sans text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {p.bandTitle}
          </h2>
          {p.bandLead.trim() ? (
            <p className="mx-auto mt-3 max-w-2xl text-center text-base font-medium text-ink-muted">{p.bandLead}</p>
          ) : null}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [p.feat1Title, p.feat1Body, "from-accent-soft to-canvas border-accent/25"],
                [p.feat2Title, p.feat2Body, "from-surface to-canvas border-line"],
                [p.feat3Title, p.feat3Body, "from-accent-soft/80 to-surface border-accent/20"],
                [p.feat4Title, p.feat4Body, "from-surface to-accent-soft border-line"],
              ] as const
            ).map(([title, body, grad], idx) => (
              <div
                key={title}
                className={`rounded-2xl border bg-gradient-to-br p-6 transition hover:-translate-y-1 hover:shadow-lg ${grad}`}
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <FeatureIcon index={idx} />
                </div>
                <h3 className="text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — numbered steps */}
      <section className="border-b border-line bg-ink py-20 text-canvas">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {p.hwTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-lg font-medium text-white/60">{p.hwLead}</p>
          <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
            {(
              [
                ["01", p.hw1Title, p.hw1Body],
                ["02", p.hw2Title, p.hw2Body],
                ["03", p.hw3Title, p.hw3Body],
              ] as const
            ).map(([num, title, body]) => (
              <div key={num} className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
                <span className="font-sans text-5xl font-bold leading-none text-accent md:text-6xl">
                  {num}
                </span>
                <h3 className="mt-4 text-xl font-bold text-canvas">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link
              href={`${prefix}/download`}
              className="inline-flex rounded-full bg-gradient-to-r from-accent to-[#7c7cff] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:-translate-y-px hover:shadow-accent/50"
            >
              {p.heroCtaPrimary}
            </Link>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sans text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{p.problemTitle}</h2>
          {p.problemLead.trim() ? (
            <p className="mt-4 text-base leading-relaxed text-ink-muted">{p.problemLead}</p>
          ) : null}
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {(
            [
              [p.risk1Title, p.risk1Body, "bg-gradient-to-br from-accent-soft/80 to-canvas border-accent/20", "bg-accent/10 text-accent"],
              [p.risk2Title, p.risk2Body, "bg-gradient-to-br from-surface to-canvas border-line", "bg-ink/8 text-ink-muted"],
              [p.risk3Title, p.risk3Body, "bg-gradient-to-br from-surface to-canvas border-line", "bg-ink/8 text-ink-muted"],
              [p.risk4Title, p.risk4Body, "bg-gradient-to-br from-canvas to-accent-soft/60 border-accent/15", "bg-signal/15 text-emerald-700"],
            ] as const
          ).map(([title, body, cardCls, dotCls]) => (
            <div
              key={title}
              className={`flex flex-col rounded-3xl border bg-canvas p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardCls}`}
            >
              <div className={`mb-4 inline-flex h-2.5 w-2.5 rounded-full ${dotCls}`} aria-hidden />
              <h3 className="font-sans text-xl font-semibold tracking-tight text-ink">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Solution + image */}
      <section className="border-y border-line bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="order-2 overflow-hidden rounded-[2rem] border border-line/60 bg-canvas shadow-[0_24px_48px_-12px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] lg:order-1">
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{p.solveEyebrow}</p>
            <h2 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{p.solveTitle}</h2>
            {p.solveLead.trim() ? (
              <p className="mt-4 text-base leading-relaxed text-ink-muted">{p.solveLead}</p>
            ) : null}
            <ul className="mt-8 space-y-4 text-sm text-ink-muted">
              {[p.solve1, p.solve2, p.solve3].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-signal shadow-[0_0_8px_rgba(0,230,118,0.6)]" aria-hidden />
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">{p.demoEyebrow}</p>
          <h2 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{p.demoTitle}</h2>
          {p.demoLead.trim() ? <p className="mt-4 text-base text-ink-muted">{p.demoLead}</p> : null}
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <article className="rounded-3xl border border-red-200/90 bg-canvas p-6 shadow-[0_20px_50px_-28px_rgba(185,28,28,0.28)] sm:p-8">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">{p.blockedTitle}</h3>
                <p className="text-xs text-ink-muted">{p.blockedSub}</p>
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
            <p className="mt-3 text-xs font-medium text-ink-muted">{p.blockedRisk}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
              <div className="h-full w-full rounded-full bg-red-500" />
            </div>
            <p className="mt-4 text-sm text-ink-muted">{p.blockedMsg}</p>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-ink-muted/70">
              {p.blockedPreviewLabel}
            </p>
            <div className="mt-2 rounded-2xl border border-accent/15 bg-accent-soft/50 p-4 font-mono text-xs leading-relaxed text-ink">
              {p.blockedPreview}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink-muted"
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
                className="rounded-xl px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-surface"
              >
                {p.blockedCancel}
              </button>
            </div>
          </article>

          <article className="rounded-3xl border border-accent/25 bg-canvas p-6 shadow-[0_20px_50px_-28px_rgba(92,92,255,0.22)] sm:p-8">
            <header>
              <h3 className="text-lg font-semibold text-ink">{p.toneTitle}</h3>
              <p className="text-xs text-ink-muted">{p.toneSub}</p>
            </header>
            <div className="mt-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              {p.toneBadge}
            </div>
            <p className="mt-4 text-sm text-ink-muted">{p.toneMsg}</p>
            <div className="mt-6 space-y-3">
              {[p.toneAlt1, p.toneAlt2, p.toneAlt3].map((alt) => (
                <div
                  key={alt}
                  className="rounded-2xl border border-accent/15 bg-accent-soft/40 p-4 text-sm leading-relaxed text-ink"
                >
                  <p>{alt}</p>
                  <button
                    type="button"
                    className="mt-3 text-xs font-semibold text-accent hover:underline"
                  >
                    {p.toneUse} ✓
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-6">
              <button
                type="button"
                className="rounded-xl border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink-muted"
              >
                {p.toneEdit}
              </button>
              <button type="button" className="rounded-xl px-4 py-2 text-xs font-semibold text-red-600">
                {p.toneSendOrig}
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-surface"
              >
                {p.toneCancel}
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* People — cartes sobres, accent violet */}
      <section className="relative overflow-hidden border-t border-line bg-ink py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-signal/15 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-accent/25 blur-[90px]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[80px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-signal">{p.peopleKicker}</p>
            <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-canvas sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
              {p.peopleTitle}
            </h2>
            {p.peopleLead.trim() ? (
              <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-relaxed text-white/60">{p.peopleLead}</p>
            ) : null}
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-5 lg:items-stretch">
            {(
              [
                {
                  featured: false,
                  icon: "shield" as const,
                  grad: "from-ink-muted to-ink",
                  ring: "ring-white/10",
                  eyebrow: p.people1Eyebrow,
                  title: p.people1Title,
                  body: p.people1Body,
                  chips: [p.people1Chip1, p.people1Chip2],
                },
                {
                  featured: true,
                  icon: "users" as const,
                  grad: "from-accent to-[#4343cc]",
                  ring: "ring-accent/50",
                  eyebrow: p.people2Eyebrow,
                  title: p.people2Title,
                  body: p.people2Body,
                  chips: [p.people2Chip1, p.people2Chip2],
                },
                {
                  featured: false,
                  icon: "chat" as const,
                  grad: "from-[#4343cc] to-accent",
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
                    ? `z-[1] shadow-[0_0_0_1px_rgba(92,92,255,0.45),0_24px_80px_-24px_rgba(92,92,255,0.35)] ring-2 ${card.ring} lg:-my-2 lg:scale-[1.02] lg:py-10`
                    : `ring-1 ${card.ring}`
                }`}
              >
                {card.featured ? (
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
                ) : null}
                <div
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.grad} text-canvas shadow-lg transition group-hover:scale-105 group-hover:shadow-xl`}
                >
                  <PeopleCardIcon kind={card.icon} />
                </div>
                <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">{card.eyebrow}</p>
                <h3 className="mt-2 font-sans text-2xl font-bold text-canvas">{card.title}</h3>
                <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-white/60">{card.body}</p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {card.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/85"
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
      <section className="relative overflow-hidden border-t border-line bg-canvas py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_30%,rgba(92,92,255,0.08),transparent),radial-gradient(60%_50%_at_85%_70%,rgba(0,230,118,0.06),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{p.privacyEyebrow}</p>
            <h2 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{p.privacyTitle}</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">{p.privacyLead}</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {(
              [
                [p.privacy1Title, p.privacy1Body, "from-signal to-emerald-600"],
                [p.privacy2Title, p.privacy2Body, "from-accent to-[#4343cc]"],
                [p.privacy3Title, p.privacy3Body, "from-ink-muted to-ink"],
              ] as const
            ).map(([title, body, grad]) => (
              <div
                key={title}
                className={`rounded-3xl bg-gradient-to-br p-[2px] shadow-lg shadow-ink/5 ${grad}`}
              >
                <div className="h-full rounded-[22px] bg-canvas p-7">
                  <h3 className="font-sans text-lg font-semibold tracking-tight text-ink">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture teaser */}
      <section className="border-t border-line bg-gradient-to-b from-accent-soft/60 to-canvas py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-accent/20 bg-gradient-to-br from-canvas to-accent-soft/40 p-8 shadow-md sm:p-10">
            <h2 className="font-sans text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{p.archTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">{p.archLead}</p>
            <Link
              href={`${prefix}/docs/stack`}
              className="mt-6 inline-flex text-sm font-semibold text-accent underline-offset-4 hover:underline"
            >
              {p.archLink} →
            </Link>
          </div>
        </div>
      </section>

      {/* Install */}
      <section className="border-t border-line bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-sans text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{l.installTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">{l.installSubtitle}</p>
          <div className="mt-8">
            <ExtensionDownloadGrid dict={dict} />
          </div>
        </div>
      </section>

      <section
        id="developer-install"
        className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6"
      >
        <div className="rounded-[2rem] border border-line bg-canvas p-8 shadow-sm sm:p-10">
          <h2 className="font-sans text-2xl font-semibold tracking-tight text-ink">{l.associateTitle}</h2>
          <p className="mt-2 text-sm text-ink-muted">{l.associateSubtitle}</p>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-ink-muted">
            <li>{l.associateStep1}</li>
            <li>{l.associateStep2}</li>
            <li>{l.associateStep3}</li>
          </ol>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line bg-ink px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-sans text-3xl font-semibold tracking-tight text-canvas sm:text-4xl">{p.ctaBandTitle}</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">{p.ctaBandLead}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`${prefix}/download`}
              className="inline-flex rounded-full bg-canvas px-6 py-3 text-sm font-semibold text-ink hover:bg-surface"
            >
              {p.ctaBandPrimary}
            </Link>
            <Link
              href={`${prefix}/pricing`}
              className="inline-flex rounded-full border border-white/35 px-6 py-3 text-sm font-semibold text-canvas hover:border-white/55"
            >
              {p.ctaBandSecondary}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
