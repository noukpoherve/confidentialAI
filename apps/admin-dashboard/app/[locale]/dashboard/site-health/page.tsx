import { fetchSiteSignalSummary } from "../../../../lib/api";

export default async function SiteHealthPage() {
  let data: { items: Array<{ hostname: string; count: number; events: Record<string, number>; lastSeenAt: string }>; total: number } =
    { items: [], total: 0 };
  let error: string | null = null;

  try {
    data = await fetchSiteSignalSummary();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const totalEvents = data.items.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Site health</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Detect where extension interception fails to prioritize platform fixes.
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          API unreachable: {error}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Impacted hosts" value={data.total} />
            <Metric label="Total signals" value={totalEvents} />
            <Metric label="Top host" value={data.items[0]?.hostname || "N/A"} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-canvas shadow-sm">
            {data.items.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted">No site issues recorded yet.</div>
            ) : (
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-surface">
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Hostname
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Signal count
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Event breakdown
                    </th>
                    <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Last seen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.hostname} className="hover:bg-surface/80">
                      <td className="border-b border-line/80 px-3 py-2 text-sm font-medium text-ink">
                        {row.hostname}
                      </td>
                      <td className="border-b border-line/80 px-3 py-2 text-sm text-ink-muted">
                        {row.count}
                      </td>
                      <td className="border-b border-line/80 px-3 py-2 text-xs text-ink-muted">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(row.events).map(([event, count]) => (
                            <span
                              key={`${row.hostname}-${event}`}
                              className="rounded-full border border-line bg-surface px-2 py-0.5"
                            >
                              {event}: {count}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="border-b border-line/80 px-3 py-2 text-xs text-ink-muted/80">
                        {row.lastSeenAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold leading-none text-ink">{value}</p>
    </div>
  );
}
