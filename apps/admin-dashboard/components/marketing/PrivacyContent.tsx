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

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-stone-950">{pr.title}</h1>
      <p className="mb-10 text-sm text-stone-500">{pr.updated}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s1Title}</h2>
        <p className="leading-relaxed text-stone-700">{pr.s1Body}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s2Title}</h2>
        <p className="mb-3 leading-relaxed text-stone-700">{pr.s2Intro}</p>
        <ul className="list-disc space-y-2 pl-6 text-stone-700">
          <li>
            <strong>{pr.s2Item1Title}</strong> {pr.s2Item1Body}
          </li>
          <li>
            <strong>{pr.s2Item2Title}</strong> {pr.s2Item2Body}
          </li>
          <li>
            <strong>{pr.s2Item3Title}</strong> {pr.s2Item3Body}
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s3Title}</h2>
        <ul className="list-disc space-y-2 pl-6 text-stone-700">
          {s3Items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s4Title}</h2>
        <ul className="list-disc space-y-2 pl-6 text-stone-700">
          {s4Items.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong> {item.body}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s5Title}</h2>
        <p className="leading-relaxed text-stone-700">{pr.s5Body}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s6Title}</h2>
        <p className="leading-relaxed text-stone-700">{pr.s6Body}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s7Title}</h2>
        <p className="leading-relaxed text-stone-700">{pr.s7Body}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s8Title}</h2>
        <p className="leading-relaxed text-stone-700">
          {pr.s8Body}{" "}
          <a href={`mailto:${pr.contactEmail}`} className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
            {pr.contactEmail}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-stone-900">{pr.s9Title}</h2>
        <p className="leading-relaxed text-stone-700">{pr.s9Body}</p>
      </section>
    </main>
  );
}
