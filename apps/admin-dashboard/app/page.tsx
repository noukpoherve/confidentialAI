import { fetchIncidents, fetchSiteSignalSummary } from "../lib/api";

function countByAction(items: Array<Record<string, unknown>>) {
  const counters: Record<string, number> = { ALLOW: 0, ANONYMIZE: 0, WARN: 0, BLOCK: 0 };
  for (const item of items) {
    const action = String(item.action || "").toUpperCase();
    if (action in counters) counters[action] += 1;
  }
  return counters;
}

export default async function HomePage() {
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
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Monitoring Overview</h2>
        <p className="mt-1 text-sm text-slate-500">
          Real-time posture for prompt/response security and site reliability.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          API unavailable: {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total Incidents" value={incidentTotal} tone="slate" />
        <MetricCard label="Blocked" value={counters.BLOCK} tone="red" />
        <MetricCard label="Warnings" value={counters.WARN} tone="amber" />
        <MetricCard label="Anonymized" value={counters.ANONYMIZE} tone="blue" />
        <MetricCard label="Sites With Issues" value={siteIssueTotal} tone="purple" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">System Status</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Extension interception active across configured platforms/domains</li>
            <li>LangGraph orchestration active (AFE to LLM classifier to AC, AVS to LLM classifier to AC)</li>
            <li>Incident persistence active (Mongo with in-memory failover)</li>
            <li>Site-health telemetry active for failure feedback loop</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Improvement Priorities
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Review `Site Health` regularly for unsupported DOM patterns</li>
            <li>Tune classifier thresholds to reduce false positives</li>
            <li>Expand custom platform profiles from high-failure domains</li>
            <li>Prepare tenant policies before billing rollout</li>
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
