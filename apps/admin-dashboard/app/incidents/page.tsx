import { fetchIncidents } from "../../lib/api";

export default async function IncidentsPage() {
  let data: { items: Array<Record<string, unknown>>; total: number } = { items: [], total: 0 };
  let error: string | null = null;

  try {
    data = await fetchIncidents();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <section>
      <h2>Incidents</h2>
      {error ? (
        <div className="card">
          <strong>API unreachable:</strong> {error}
        </div>
      ) : (
        <div className="card">
          <p>Total incidents: {data.total}</p>
          {data.items.length === 0 ? (
            <p>No incidents recorded yet.</p>
          ) : (
            <pre>{JSON.stringify(data.items, null, 2)}</pre>
          )}
        </div>
      )}
    </section>
  );
}
