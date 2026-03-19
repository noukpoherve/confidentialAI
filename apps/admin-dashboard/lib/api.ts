const API_BASE_URL = process.env.NEXT_PUBLIC_SECURITY_API_URL || "http://localhost:8080";

export interface IncidentListResponse {
  items: Array<Record<string, unknown>>;
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
