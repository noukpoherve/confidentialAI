const DEFAULT_API_BASE_URL = "http://localhost:8080";

async function getApiBaseUrl() {
  const data = await chrome.storage.sync.get(["apiBaseUrl"]);
  return data.apiBaseUrl || DEFAULT_API_BASE_URL;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const routeByType = {
    ANALYZE_PROMPT: "/v1/analyze",
    ANALYZE_RESPONSE: "/v1/validate-response",
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
