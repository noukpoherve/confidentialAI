import type { Dictionary } from "../../lib/i18n";

export function PrivacyContent({ dict }: { dict: Dictionary }) {
  const pr = dict.privacy;

  const s3Items = [pr.s3Li1, pr.s3Li2, pr.s3Li3, pr.s3Li4, pr.s3Li5];
  const s4Items = [
    { title: pr.s4Item1Title, body: pr.s4Item1Body },
    { title: pr.s4Item2Title, body: pr.s4Item2Body },
    { title: pr.s4Item3Title, body: pr.s4Item3Body },
    { title: pr.s4Item4Title, body: pr.s4Item4Body },
    { title: pr.s4Item5Title, body: pr.s4Item5Body },
  ];

  const sectionCls = "group relative border-b border-line pb-10 pt-8 first:pt-0 last:border-0";
  const h2Cls = "text-lg font-semibold tracking-tight text-ink";
  const bodyCls = "mt-3 text-[0.9375rem] leading-[1.75] text-ink-muted";

  return (
    <div>
      {/* Page header */}
      <div className="relative border-b border-line bg-canvas">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(92,92,255,0.06),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Legal</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">{pr.title}</h1>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
            {pr.updated}
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s1Title}</h2>
          <p className={bodyCls}>{pr.s1Body}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s2Title}</h2>
          <p className={bodyCls}>{pr.s2Intro}</p>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-muted">
            {[
              [pr.s2Item1Title, pr.s2Item1Body],
              [pr.s2Item2Title, pr.s2Item2Body],
              [pr.s2Item3Title, pr.s2Item3Body],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" aria-hidden />
                <span><strong className="font-semibold text-ink">{title}</strong> {body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s3Title}</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-muted">
            {s3Items.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s4Title}</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-muted">
            {s4Items.map((item) => (
              <li key={item.title} className="flex gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" aria-hidden />
                <span><strong className="font-semibold text-ink">{item.title}</strong> {item.body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s5Title}</h2>
          <p className={bodyCls}>{pr.s5Body}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s6Title}</h2>
          <p className={bodyCls}>{pr.s6Body}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s7Title}</h2>
          <p className={bodyCls}>{pr.s7Body}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s8Title}</h2>
          <p className={bodyCls}>
            {pr.s8Body}{" "}
            <a
              href={`mailto:${pr.contactEmail}`}
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              {pr.contactEmail}
            </a>
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{pr.s9Title}</h2>
          <p className={bodyCls}>{pr.s9Body}</p>
        </section>
      </main>
    </div>
  );
}
