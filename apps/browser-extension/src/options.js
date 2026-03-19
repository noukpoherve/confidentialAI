const DEFAULT_API_BASE_URL = "http://localhost:8080";

async function restore() {
  const field = document.getElementById("apiBaseUrl");
  if (!field) return;

  const data = await chrome.storage.sync.get(["apiBaseUrl"]);
  field.value = data.apiBaseUrl || DEFAULT_API_BASE_URL;
}

async function save() {
  const field = document.getElementById("apiBaseUrl");
  const status = document.getElementById("status");
  if (!field || !status) return;

  const value = String(field.value || "").trim();
  if (!value) {
    status.textContent = "Invalid URL.";
    return;
  }

  await chrome.storage.sync.set({ apiBaseUrl: value });
  status.textContent = "Configuration saved.";
}

document.getElementById("saveBtn")?.addEventListener("click", save);
restore();
