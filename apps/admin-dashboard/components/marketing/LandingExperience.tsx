import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "../../lib/i18n";
import { ExtensionDownloadGrid } from "./ExtensionDownloadGrid";

const IMG = {
  hero: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=82",
  solve: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&q=82",
  p1: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=82",
  p2: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=82",
  p3: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=900&q=82",
};

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
            <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">{p.heroLead}</p>
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

      {/* Strip */}
      <section className="border-b-2 border-stone-900 bg-gradient-to-r from-emerald-50 via-white to-violet-50 py-14">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="font-sans text-2xl font-extrabold text-stone-950 sm:text-3xl md:text-4xl">
            {p.stripTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-stone-700 sm:text-base">
            {p.stripSub}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {(
              [
                [p.pillAi, "from-emerald-500/20 to-teal-500/20 border-emerald-400/50 text-emerald-950"],
                [p.pillSocial, "from-violet-500/20 to-purple-500/20 border-violet-400/50 text-violet-950"],
                [p.pillCare, "from-sky-500/20 to-blue-500/20 border-sky-400/50 text-sky-950"],
                [p.pillCollab, "from-amber-500/25 to-orange-400/20 border-amber-400/50 text-amber-950"],
              ] as const
            ).map(([label, cls]) => (
              <span
                key={label}
                className={`rounded-full border bg-gradient-to-br px-5 py-2.5 text-xs font-bold uppercase tracking-wide shadow-sm ${cls}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* All-in-one feature grid */}
      <section className="border-b-2 border-stone-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-sans text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">
            {p.bandTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base font-medium text-stone-600">
            {p.bandLead}
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                [p.feat1Title, p.feat1Body],
                [p.feat2Title, p.feat2Body],
                [p.feat3Title, p.feat3Body],
                [p.feat4Title, p.feat4Body],
                [p.feat5Title, p.feat5Body],
                [p.feat6Title, p.feat6Body],
              ] as const
            ).map(([title, body]) => (
              <div key={title} className="rounded-2xl border-2 border-stone-200 bg-stone-50/50 p-6 transition hover:border-emerald-400/60 hover:bg-white">
                <h3 className="text-lg font-extrabold text-stone-950">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-stone-600">{body}</p>
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
          <p className="mt-4 text-base leading-relaxed text-stone-600">{p.problemLead}</p>
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
            <p className="mt-4 text-base leading-relaxed text-stone-600">{p.solveLead}</p>
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
          <p className="mt-4 text-base text-stone-600">{p.demoLead}</p>
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

      {/* People */}
      <section className="border-t border-stone-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-medium text-stone-900 sm:text-4xl">{p.peopleTitle}</h2>
            <p className="mt-4 text-base text-stone-600">{p.peopleLead}</p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {(
              [
                [IMG.p1, p.imageP1Alt, p.people1Title, p.people1Body],
                [IMG.p2, p.imageP2Alt, p.people2Title, p.people2Body],
                [IMG.p3, p.imageP3Alt, p.people3Title, p.people3Body],
              ] as const
            ).map(([src, alt, title, body]) => (
              <div key={title} className="flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#FAFAF8] shadow-sm">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={src}
                    alt={alt}
                    width={900}
                    height={675}
                    className="h-full w-full object-cover"
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-serif text-xl font-medium text-stone-900">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">{body}</p>
                </div>
              </div>
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
