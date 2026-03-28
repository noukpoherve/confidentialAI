const API_BASE_URL = process.env.NEXT_PUBLIC_SECURITY_API_URL || "http://localhost:8080";

export interface IncidentListResponse {
  items: Array<Record<string, unknown>>;
  total: number;
}

export interface SiteSignalSummaryRow {
  hostname: string;
  count: number;
  events: Record<string, number>;
  lastSeenAt: string;
}

export interface SiteSignalSummaryResponse {
  items: SiteSignalSummaryRow[];
  total: number;
}

export async function fetchIncidents(): Promise<IncidentListResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/incidents`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch incidents (${response.status})`);
  }

  return response.json();
}

export async function fetchSiteSignalSummary(): Promise<SiteSignalSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/site-signals/summary`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch site signal summary (${response.status})`);
  }

  return response.json();
}
