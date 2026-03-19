const DEFAULT_API_BASE_URL = "http://localhost:8080";

async function getApiBaseUrl() {
  const data = await chrome.storage.sync.get(["apiBaseUrl"]);
  return data.apiBaseUrl || DEFAULT_API_BASE_URL;
}

async function checkHealth() {
  const label = document.getElementById("apiStatus");
  if (!label) return;

  try {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/health`);
    label.textContent = response.ok
      ? `API OK (${baseUrl})`
      : `API unavailable (${response.status})`;
  } catch (_error) {
    label.textContent = "API unavailable (network error)";
  }
}

checkHealth();
