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
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Monitoring overview</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Real-time posture for prompt security and site reliability.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          API unavailable: {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total incidents" value={incidentTotal} tone="neutral" />
        <MetricCard label="Blocked" value={counters.BLOCK} tone="red" />
        <MetricCard label="Warnings" value={counters.WARN} tone="amber" />
        <MetricCard label="Anonymized" value={counters.ANONYMIZE} tone="blue" />
        <MetricCard label="Sites with issues" value={siteIssueTotal} tone="accent" />
      </div>

      <div className="rounded-3xl border border-accent/25 bg-accent-soft/50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink">Cost over time</h3>
          <div className="flex gap-1 rounded-full border border-line bg-canvas p-1 text-xs font-semibold">
            <span className="rounded-full bg-accent px-3 py-1 text-white">7d</span>
            <span className="rounded-full px-3 py-1 text-ink-muted">30d</span>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-accent/30 bg-canvas/80 py-16 text-center">
          <p className="text-sm font-medium text-ink-muted">No data yet</p>
          <p className="mt-1 max-w-sm text-xs text-ink-muted/80">
            Connect billing and usage pipelines to render this chart.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-canvas p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">System status</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li>Extension interception across configured platforms</li>
            <li>LangGraph orchestration (AFE, AVS, ASI, AC)</li>
            <li>MongoDB incidents with in-memory failover</li>
            <li>Site-health telemetry for selector feedback</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-canvas p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Next steps</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
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
  tone: "neutral" | "red" | "amber" | "blue" | "accent";
}) {
  const toneMap: Record<string, string> = {
    neutral: "border-line bg-canvas text-ink",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    accent: "border-accent/30 bg-accent-soft text-ink",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-none">{value}</p>
    </div>
  );
}
