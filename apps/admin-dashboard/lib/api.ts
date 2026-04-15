const API_BASE_URL = process.env.NEXT_PUBLIC_SECURITY_API_URL || "http://localhost:8080";

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; createdAt?: string };
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Login failed");
  }
  return data as AuthResponse;
}

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Registration failed");
  }
  return data as AuthResponse;
}

export interface IncidentListResponse {
  items: Array<Record<string, unknown>>;
  total: number;
  limit?: number;
  offset?: number;
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

// NOTE: /v1/incidents requires a Bearer token since the API now enforces auth.
// Pass the session JWT here once dashboard authentication is implemented.
// Until then, this will return an empty list with an authRequired flag so the
// dashboard can show a "Login required" state instead of crashing.
export async function fetchIncidents(
  token?: string,
  limit = 100,
  offset = 0,
): Promise<IncidentListResponse & { authRequired?: boolean }> {
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/v1/incidents?limit=${limit}&offset=${offset}`,
    { cache: "no-store", headers },
  );

  if (response.status === 401) {
    // Dashboard auth not yet wired — return empty list with a flag so the UI
    // can render a "Login required" notice instead of an unhandled error.
    return { items: [], total: 0, authRequired: true };
  }

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
