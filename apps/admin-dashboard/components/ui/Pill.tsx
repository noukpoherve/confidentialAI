export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "emerald" | "sky" | "violet" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    neutral: "border-slate-200 bg-white text-slate-700",
    emerald: "border-emerald-200/80 bg-emerald-100/80 text-emerald-900",
    sky: "border-sky-200/80 bg-sky-100/80 text-sky-900",
    violet: "border-violet-200/80 bg-violet-100/80 text-violet-900",
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
