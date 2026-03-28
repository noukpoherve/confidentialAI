import { fetchIncidents, fetchSiteSignalSummary } from "../../../lib/api";

function countByAction(items: Array<Record<string, unknown>>) {
  const counters: Record<string, number> = { ALLOW: 0, ANONYMIZE: 0, WARN: 0, BLOCK: 0 };
  for (const item of items) {
    const action = String(item.action || "").toUpperCase();
    if (action in counters) counters[action] += 1;
  }
  return counters;
}

export default async function DashboardHomePage() {
  let incidentTotal = 0;
  let siteIssueTotal = 0;
  let counters: Record<string, number> = { ALLOW: 0, ANONYMIZE: 0, WARN: 0, BLOCK: 0 };
  let error: string | null = null;

  try {
    const [incidentData, siteSummary] = await Promise.all([fetchIncidents(), fetchSiteSignalSummary()]);
    incidentTotal = incidentData.total;
    siteIssueTotal = siteSummary.total;
    counters = countByAction(incidentData.items);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown dashboard data error";
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Monitoring overview</h2>
        <p className="mt-1 text-sm text-slate-500">
          Real-time posture for prompt security and site reliability.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          API unavailable: {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total incidents" value={incidentTotal} tone="slate" />
        <MetricCard label="Blocked" value={counters.BLOCK} tone="red" />
        <MetricCard label="Warnings" value={counters.WARN} tone="amber" />
        <MetricCard label="Anonymized" value={counters.ANONYMIZE} tone="blue" />
        <MetricCard label="Sites with issues" value={siteIssueTotal} tone="purple" />
      </div>

      <div className="rounded-3xl border border-violet-200/70 bg-[#F5F3FF]/50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-violet-900">Cost over time</h3>
          <div className="flex gap-1 rounded-full border border-violet-200 bg-white p-1 text-xs font-semibold">
            <span className="rounded-full bg-violet-600 px-3 py-1 text-white">7d</span>
            <span className="rounded-full px-3 py-1 text-slate-600">30d</span>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-300/80 bg-white/80 py-16 text-center">
          <p className="text-sm font-medium text-slate-600">No data yet</p>
          <p className="mt-1 max-w-sm text-xs text-slate-400">Connect billing and usage pipelines to render this chart.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">System status</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Extension interception across configured platforms</li>
            <li>LangGraph orchestration (AFE, AVS, ASI, AC)</li>
            <li>MongoDB incidents with in-memory failover</li>
            <li>Site-health telemetry for selector feedback</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Next steps</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Wire auth middleware (JWT / session)</li>
            <li>Back API keys with SHA-256 hashes in MongoDB</li>
            <li>Index embeddings in Qdrant for semantic features</li>
            <li>Enable Stripe Customer Portal for billing</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "red" | "amber" | "blue" | "purple";
}) {
  const toneMap: Record<string, string> = {
    slate: "border-slate-200 bg-white text-slate-900",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    purple: "border-purple-200 bg-purple-50 text-purple-800",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-none">{value}</p>
    </div>
  );
}
