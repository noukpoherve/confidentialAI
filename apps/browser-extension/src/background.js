const DEFAULT_API_BASE_URL = "http://localhost:8080";

async function getApiBaseUrl() {
  const data = await chrome.storage.sync.get(["apiBaseUrl"]);
  return data.apiBaseUrl || DEFAULT_API_BASE_URL;
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
    ANALYZE_PROMPT: "/v1/analyze",
    ANALYZE_RESPONSE: "/v1/validate-response",
    SIGNAL_SITE_ISSUE: "/v1/site-signals",
  };
  const route = routeByType[message?.type];
  if (!route) {
    return false;
  }

  (async () => {
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}${route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.payload),
      });

      if (!response.ok) {
        sendResponse({
          ok: false,
          error: `API error (${response.status})`,
        });
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

  // Keep the channel open for an async response.
  return true;
});
