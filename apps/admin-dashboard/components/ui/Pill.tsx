export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "emerald" | "sky" | "violet" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-canvas text-ink-muted",
    emerald: "border-signal/35 bg-signal/10 text-ink",
    sky: "border-accent/30 bg-accent-soft text-ink",
    violet: "border-accent/40 bg-accent-soft text-ink",
    amber: "border-amber-200/80 bg-amber-100/80 text-amber-900",
    rose: "border-rose-200/80 bg-rose-100/80 text-rose-900",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
