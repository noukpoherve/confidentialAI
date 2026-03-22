const DEFAULT_API_BASE_URL = "http://localhost:8080";
const SETTINGS_KEYS = ["apiBaseUrl", "guardrailEnabled", "autoAnonymize", "imageModerationEnabled", "enabledPlatformIds", "customDomains"];

function getSiteConfigApi() {
  return window.ConfidentialAgentSiteConfigs;
}

function normalizeDomain(domain) {
  const api = getSiteConfigApi();
  if (api?.normalizeDomain) return api.normalizeDomain(domain);
  return String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

// ── Platforms ──────────────────────────────────────────────────────────────

function renderPlatforms(enabledIds) {
  const list = document.getElementById("platformList");
  const api = getSiteConfigApi();
  if (!list || !api) return;

  list.innerHTML = "";
  for (const platform of api.SITE_CONFIGS) {
    const isChecked = enabledIds.includes(platform.id);

    const item = document.createElement("label");
    item.htmlFor = `plat-${platform.id}`;
    item.className = [
      "flex items-center gap-2.5 p-2.5 rounded-xl border-[1.5px] cursor-pointer transition-all duration-150",
      isChecked
        ? "bg-indigo-50 border-indigo-400 text-indigo-700"
        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40",
    ].join(" ");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `plat-${platform.id}`;
    cb.dataset.platformId = platform.id;
    cb.checked = isChecked;
    cb.className = "sr-only";

    const dot = document.createElement("div");
    dot.className = isChecked
      ? "w-4 h-4 rounded-[4px] bg-indigo-600 flex items-center justify-center shrink-0"
      : "w-4 h-4 rounded-[4px] bg-white border-[1.5px] border-slate-300 shrink-0";

    if (isChecked) {
      dot.innerHTML = `<svg viewBox="0 0 12 12" class="w-2.5 h-2.5" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>`;
    }

    const lbl = document.createElement("span");
    lbl.className = `text-[12px] font-semibold ${isChecked ? "text-indigo-700" : "text-slate-700"} flex-1`;
    lbl.textContent = platform.label || platform.id;

    // Badge: "Social" for social media platforms (image-only).
    const badge = platform.type === "social" ? (() => {
      const b = document.createElement("span");
      b.textContent = "IMG";
      b.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200 shrink-0";
      return b;
    })() : null;

    item.append(cb, dot, lbl, ...(badge ? [badge] : []));

    cb.addEventListener("change", () => {
      const checked = cb.checked;
      item.className = [
        "flex items-center gap-2.5 p-2.5 rounded-xl border-[1.5px] cursor-pointer transition-all duration-150",
        checked
          ? "bg-indigo-50 border-indigo-400 text-indigo-700"
          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40",
      ].join(" ");
      dot.className = checked
        ? "w-4 h-4 rounded-[4px] bg-indigo-600 flex items-center justify-center shrink-0"
        : "w-4 h-4 rounded-[4px] bg-white border-[1.5px] border-slate-300 shrink-0";
      dot.innerHTML = checked
        ? `<svg viewBox="0 0 12 12" class="w-2.5 h-2.5" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>`
        : "";
      lbl.className = `text-[12px] font-semibold ${checked ? "text-indigo-700" : "text-slate-700"}`;
    });

    list.appendChild(item);
  }
}

function collectEnabledPlatformIds() {
  const ids = [];
  document.querySelectorAll("#platformList input[type='checkbox'][data-platform-id]").forEach((el) => {
    if (el.checked) ids.push(el.dataset.platformId);
  });
  return ids;
}

function setAllPlatforms(checked) {
  document.querySelectorAll("#platformList input[type='checkbox'][data-platform-id]").forEach((el) => {
    el.checked = checked;
    el.closest(".platform-item")?.classList.toggle("checked", checked);
  });
}

// ── Custom domains ──────────────────────────────────────────────────────────

function renderCustomDomains(domains) {
  const container = document.getElementById("customDomains");
  if (!container) return;
  container.innerHTML = "";

  for (const domain of domains) {
    const chip = document.createElement("div");
    chip.className = "inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-full text-[12px] font-medium text-slate-700 hover:text-red-600 transition-all duration-150 group";

    const text = document.createElement("span");
    text.textContent = domain;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.dataset.removeDomain = domain;
    removeBtn.setAttribute("aria-label", `Remove ${domain}`);
    removeBtn.className = "text-slate-400 group-hover:text-red-500 text-[15px] leading-none transition-colors";
    removeBtn.textContent = "×";

    chip.append(text, removeBtn);
    container.appendChild(chip);
  }
}

function getCustomDomainsFromUi() {
  const values = [];
  document.querySelectorAll("#customDomains [data-remove-domain]").forEach((el) => {
    if (el.dataset.removeDomain) values.push(el.dataset.removeDomain);
  });
  return values;
}

function upsertCustomDomain(domain) {
  const errorEl = document.getElementById("domainError");
  if (errorEl) errorEl.textContent = "";

  const normalized = normalizeDomain(domain);
  if (!normalized || !normalized.includes(".")) {
    if (errorEl) errorEl.textContent = "Please enter a valid domain (e.g. example.com).";
    return;
  }

  const current = getCustomDomainsFromUi();
  if (!current.includes(normalized)) current.push(normalized);
  renderCustomDomains(current.sort());
}

// ── Status messages ─────────────────────────────────────────────────────────

function showStatus(message, type) {
  const pill = document.getElementById("statusPill");
  if (!pill) return;
  pill.textContent = message;
  const base = "text-[11.5px] font-semibold px-3 py-1 rounded-full transition-all duration-300";
  pill.className = type === "success"
    ? `${base} bg-emerald-50 text-emerald-700 border border-emerald-200`
    : `${base} bg-red-50 text-red-700 border border-red-200`;
  pill.classList.remove("hidden");
  setTimeout(() => { pill.classList.add("hidden"); }, 3000);
}

// ── API test ─────────────────────────────────────────────────────────────────

async function testApiConnection() {
  const field = document.getElementById("apiBaseUrl");
  const resultEl = document.getElementById("apiTestResult");
  if (!field || !resultEl) return;

  const url = String(field.value || "").trim();
  if (!url) { resultEl.textContent = "Enter a URL first."; return; }

  resultEl.textContent = "Testing…";
  resultEl.className = "api-test-result";

  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      resultEl.textContent = "✓ API reachable and healthy";
      resultEl.className = "api-test-result ok";
    } else {
      resultEl.textContent = `✕ API returned HTTP ${res.status}`;
      resultEl.className = "api-test-result err";
    }
  } catch {
    resultEl.textContent = "✕ Unreachable — check URL or network";
    resultEl.className = "api-test-result err";
  }
}

// ── Restore & Save ──────────────────────────────────────────────────────────

async function restore() {
  const field = document.getElementById("apiBaseUrl");
  const guardrailToggle = document.getElementById("guardrailEnabled");
  const autoAnonymizeToggle = document.getElementById("autoAnonymize");
  const imageModerationToggle = document.getElementById("imageModerationEnabled");
  const api = getSiteConfigApi();
  if (!field || !guardrailToggle || !api) return;

  const data = await chrome.storage.sync.get(SETTINGS_KEYS);
  const defaultEnabled = api.getDefaultEnabledPlatformIds();
  const enabledPlatformIds = Array.isArray(data.enabledPlatformIds)
    ? data.enabledPlatformIds
    : defaultEnabled;
  const customDomains = Array.isArray(data.customDomains)
    ? data.customDomains.map((d) => normalizeDomain(d)).filter(Boolean)
    : [];

  field.value = data.apiBaseUrl || DEFAULT_API_BASE_URL;
  guardrailToggle.checked = data.guardrailEnabled !== false;
  if (autoAnonymizeToggle) autoAnonymizeToggle.checked = data.autoAnonymize === true;
  // Image moderation is enabled by default.
  if (imageModerationToggle) imageModerationToggle.checked = data.imageModerationEnabled !== false;
  renderPlatforms(enabledPlatformIds);
  renderCustomDomains(customDomains);
}

async function save() {
  const field = document.getElementById("apiBaseUrl");
  const guardrailToggle = document.getElementById("guardrailEnabled");
  const autoAnonymizeToggle = document.getElementById("autoAnonymize");
  const imageModerationToggle = document.getElementById("imageModerationEnabled");
  if (!field || !guardrailToggle) return;

  const value = String(field.value || "").trim();
  if (!value) {
    showStatus("Invalid API URL.", "error");
    return;
  }

  const enabledPlatformIds = collectEnabledPlatformIds();
  const customDomains = getCustomDomainsFromUi();

  await chrome.storage.sync.set({
    apiBaseUrl: value,
    guardrailEnabled: guardrailToggle.checked,
    autoAnonymize: autoAnonymizeToggle ? autoAnonymizeToggle.checked : false,
    imageModerationEnabled: imageModerationToggle ? imageModerationToggle.checked : true,
    enabledPlatformIds,
    customDomains,
  });

  showStatus("Settings saved", "success");
}

// ── Event listeners ──────────────────────────────────────────────────────────

document.getElementById("saveBtn")?.addEventListener("click", save);

document.getElementById("testApiBtn")?.addEventListener("click", testApiConnection);

document.getElementById("selectAllBtn")?.addEventListener("click", () => setAllPlatforms(true));
document.getElementById("deselectAllBtn")?.addEventListener("click", () => setAllPlatforms(false));

document.getElementById("addDomainBtn")?.addEventListener("click", () => {
  const input = document.getElementById("customDomainInput");
  if (!input) return;
  upsertCustomDomain(input.value);
  input.value = "";
  input.focus();
});

document.getElementById("customDomainInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    upsertCustomDomain(e.target.value);
    e.target.value = "";
  }
});

document.getElementById("customDomains")?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const domain = target.dataset.removeDomain;
  if (!domain) return;
  const remaining = getCustomDomainsFromUi().filter((d) => d !== domain);
  renderCustomDomains(remaining);
});

restore();
