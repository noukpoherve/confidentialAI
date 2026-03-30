import { fetchIncidents } from "../../../../lib/api";

export default async function IncidentsPage() {
  let data: { items: Array<Record<string, unknown>>; total: number } = { items: [], total: 0 };
  let error: string | null = null;

  try {
    data = await fetchIncidents();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const actionCounts = summarizeActions(data.items);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Incidents</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Trace prompt/response security decisions and risk distribution.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          API unreachable: {error}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MiniMetric label="Total" value={data.total} />
            <MiniMetric label="Block" value={actionCounts.BLOCK} />
            <MiniMetric label="Warn" value={actionCounts.WARN} />
            <MiniMetric label="Anonymize" value={actionCounts.ANONYMIZE} />
            <MiniMetric label="Allow" value={actionCounts.ALLOW} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-canvas shadow-sm">
            {data.items.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted">No incidents recorded yet.</div>
            ) : (
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-surface">
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Type
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Platform
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Action
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Risk
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Reasons
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Graph
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => {
                    const action = String(item.action || "UNKNOWN").toUpperCase();
                    const reasons = Array.isArray(item.reasons) ? item.reasons : [];
                    const graph = Array.isArray(item.graphTrace) ? item.graphTrace : [];
                    return (
                      <tr key={`${item.requestId || idx}-${idx}`} className="hover:bg-surface/80">
                        <td className="border-b border-line/80 px-3 py-2 text-xs text-ink-muted">
                          {String(item.incidentType || "N/A")}
                        </td>
                        <td className="border-b border-line/80 px-3 py-2 text-xs text-ink-muted">
                          {String(item.platform || "unknown")}
                        </td>
                        <td className="border-b border-line/80 px-3 py-2 text-xs">
                          <span className={`rounded-full px-2 py-1 font-semibold ${actionBadgeClass(action)}`}>
                            {action}
                          </span>
                        </td>
                        <td className="border-b border-line/80 px-3 py-2 text-xs text-ink-muted">
                          {String(item.riskScore ?? "-")}
                        </td>
                        <td className="border-b border-line/80 px-3 py-2 text-xs text-ink-muted">
                          <div className="max-w-xs space-y-1">
                            {reasons.slice(0, 2).map((reason, rIdx) => (
                              <p key={rIdx} className="line-clamp-2">
                                {String(reason)}
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="border-b border-line/80 px-3 py-2 text-xs text-ink-muted">
                          <div className="flex flex-wrap gap-1">
                            {graph.length === 0
                              ? "-"
                              : graph.map((node, nIdx) => (
                                  <span
                                    key={`${node}-${nIdx}`}
                                    className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px]"
                                  >
                                    {String(node)}
                                  </span>
                                ))}
                          </div>
                        </td>
                        <td className="border-b border-line/80 px-3 py-2 text-xs text-ink-muted/80">
                          {String(item.createdAt || "-")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function summarizeActions(items: Array<Record<string, unknown>>) {
  const counters: Record<string, number> = { ALLOW: 0, ANONYMIZE: 0, WARN: 0, BLOCK: 0 };
  for (const item of items) {
    const action = String(item.action || "").toUpperCase();
    if (action in counters) counters[action] += 1;
  }
  return counters;
}

function actionBadgeClass(action: string) {
  if (action === "BLOCK") return "bg-red-100 text-red-700";
  if (action === "WARN") return "bg-amber-100 text-amber-700";
  if (action === "ANONYMIZE") return "bg-blue-100 text-blue-700";
  if (action === "ALLOW") return "bg-signal/15 text-emerald-800";
  return "bg-surface text-ink-muted";
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none text-ink">{value}</p>
    </div>
  );
}
