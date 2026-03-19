export default function HomePage() {
  return (
    <section>
      <div className="card">
        <h2>Overview</h2>
        <p>
          This interface lets you monitor security incidents produced by AI prompt analysis.
        </p>
      </div>
      <div className="card">
        <h3>V1 Status</h3>
        <ul>
          <li>Local interception through Chrome extension</li>
          <li>Server-side analysis through FastAPI</li>
          <li>Decision actions: allow/anonymize/block/warn</li>
        </ul>
      </div>
    </section>
  );
}
