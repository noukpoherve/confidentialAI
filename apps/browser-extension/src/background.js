const DEFAULT_API_BASE_URL = "http://localhost:8080";

async function getApiBaseUrl() {
  const data = await chrome.storage.sync.get(["apiBaseUrl"]);
  return data.apiBaseUrl || DEFAULT_API_BASE_URL;
}

async function getAuthToken() {
  try {
    const data = await chrome.storage.local.get(["authToken"]);
    return data.authToken || null;
  } catch {
    return null;
  }
}

async function incrementStats(action) {
  try {
    const { stats = { analyzed: 0, blocked: 0 } } = await chrome.storage.local.get("stats");
    stats.analyzed = (stats.analyzed || 0) + 1;
    if (action === "BLOCK") {
      stats.blocked = (stats.blocked || 0) + 1;
    }
    await chrome.storage.local.set({ stats });
  } catch {
    // Stats tracking is best-effort; never break the main flow.
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const routeByType = {
    ANALYZE_PROMPT:   "/v1/analyze",
    ANALYZE_RESPONSE: "/v1/validate-response",
    ANALYZE_IMAGE:    "/v1/analyze-image",
    SIGNAL_SITE_ISSUE: "/v1/site-signals",
  };

  // ── Direct API proxy (content script → background → API) ─────────────────
  const route = routeByType[message?.type];
  if (route) {
    (async () => {
      try {
        const [apiBaseUrl, token] = await Promise.all([getApiBaseUrl(), getAuthToken()]);
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${apiBaseUrl}${route}`, {
          method: "POST",
          headers,
          body: JSON.stringify(message.payload),
        });

        if (!response.ok) {
          sendResponse({ ok: false, error: `API error (${response.status})` });
          return;
        }

        const data = await response.json();
        sendResponse({ ok: true, data });

        if (message.type === "ANALYZE_PROMPT") {
          await incrementStats(data.action);
        }
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
    return true; // Keep channel open for async response.
  }

  // ── Auth / settings proxy (options page → background → API) ──────────────
  // Options page uses this to avoid CORS issues with non-localhost deployments.
  if (message?.type === "API_CALL") {
    (async () => {
      try {
        const { method = "GET", path, body, useToken = true } = message.payload || {};
        const [apiBaseUrl, token] = await Promise.all([getApiBaseUrl(), getAuthToken()]);
        const headers = { "Content-Type": "application/json" };
        if (useToken && token) headers["Authorization"] = `Bearer ${token}`;

        const fetchOptions = { method, headers };
        if (body) fetchOptions.body = JSON.stringify(body);

        const response = await fetch(`${apiBaseUrl}${path}`, fetchOptions);
        const data = await response.json().catch(() => ({}));
        sendResponse({ ok: response.ok, status: response.status, data });
      } catch (error) {
        sendResponse({
          ok: false,
          status: 0,
          error: error instanceof Error ? error.message : "Network error",
        });
      }
    })();
    return true;
  }

  // ── Token management ──────────────────────────────────────────────────────
  if (message?.type === "SET_AUTH_TOKEN") {
    chrome.storage.local.set({ authToken: message.token }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "CLEAR_AUTH_TOKEN") {
    chrome.storage.local.remove("authToken").then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
