const DEFAULT_API_BASE_URL = "http://localhost:8080";

const I18n = globalThis.ConfidentialAgentI18n;

/** @type {string} */
let popupLocale = "en";

function tt(key, vars) {
  return I18n.t(key, popupLocale, vars);
}

async function readPopupLocale() {
  if (!I18n) return "en";
  popupLocale = I18n.normalizeLocale(await I18n.getUiLocale());
  return popupLocale;
}

function applyPopupI18n() {
  if (!I18n) return;
  I18n.applyDocumentI18n(document, popupLocale);
  document.title = tt("opt_brand");
}

function checkApiHealthViaBackgroundOnce() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "HEALTH_CHECK" }, (res) => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr) {
          resolve({ ok: false, status: 0, error: lastErr.message });
          return;
        }
        resolve(res || { ok: false, status: 0, error: "No response from background" });
      });
    } catch (e) {
      resolve({ ok: false, status: 0, error: e instanceof Error ? e.message : String(e) });
    }
  });
}

/** Service worker can be asleep on first open; one short retry fixes “Receiving end does not exist”. */
async function checkApiHealthViaBackground() {
  let res = await checkApiHealthViaBackgroundOnce();
  const err = (res.error || "").toLowerCase();
  const needsRetry =
    !res.ok &&
    res.status === 0 &&
    (err.includes("receiving end") || err.includes("no response") || err.includes("extension context"));
  if (needsRetry) {
    await new Promise((r) => setTimeout(r, 450));
    res = await checkApiHealthViaBackgroundOnce();
  }
  return res;
}

async function getSettings() {
  const data = await chrome.storage.sync.get([
    "apiBaseUrl",
    "guardrailEnabled",
    "enabledPlatformIds",
    "customDomains",
    "userAddedPlatforms",
  ]);
  const local = await chrome.storage.local.get(["stats"]);
  return {
    apiBaseUrl: data.apiBaseUrl || DEFAULT_API_BASE_URL,
    guardrailEnabled: data.guardrailEnabled !== false,
    enabledPlatformIds: Array.isArray(data.enabledPlatformIds) ? data.enabledPlatformIds : [],
    customDomains: Array.isArray(data.customDomains) ? data.customDomains : [],
    userAddedPlatforms: Array.isArray(data.userAddedPlatforms) ? data.userAddedPlatforms : [],
    stats: local.stats || { analyzed: 0, blocked: 0 },
  };
}

async function getCurrentTabHostname() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

function setStatus(state, label, sub) {
  const orbInner = document.getElementById("orbInner");
  const orbIcon  = document.getElementById("orbIcon");
  const orbRing  = document.getElementById("orbRing");
  const labelEl  = document.getElementById("statusLabel");
  const subEl    = document.getElementById("statusSub");

  const palette = {
    ok:       { color: "#10b981", ring: true },
    offline:  { color: "#ef4444", ring: false },
    checking: { color: "#6366f1", ring: false },
  };
  const p = palette[state] || palette.checking;

  labelEl.className = `status-label ${state}`;
  labelEl.textContent = label;
  subEl.textContent = sub;

  orbInner.className = `orb-inner ${state === "ok" ? "" : state}`;

  if (state === "ok") {
    orbIcon.innerHTML = `<polyline points="20 6 9 17 4 12" stroke="${p.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    orbRing.style.display = "block";
    orbRing.style.borderColor = p.color;
  } else if (state === "offline") {
    orbIcon.innerHTML = `
      <line x1="18" y1="6" x2="6" y2="18" stroke="${p.color}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="${p.color}" stroke-width="2.5" stroke-linecap="round"/>
    `;
    orbRing.style.display = "none";
  } else {
    orbIcon.innerHTML = `
      <circle cx="12" cy="12" r="10" stroke="${p.color}" stroke-width="2"/>
      <path d="M12 8v4M12 16h.01" stroke="${p.color}" stroke-width="2.5" stroke-linecap="round"/>
    `;
    orbRing.style.display = "none";
  }
  orbIcon.setAttribute("fill", "none");
  orbIcon.setAttribute("viewBox", "0 0 24 24");
}

function updatePlatformUI(hostname, guardrailEnabled, syncSnapshot) {
  const api = window.ConfidentialAgentSiteConfigs;
  const dotEl   = document.getElementById("platformDot");
  const nameEl  = document.getElementById("platformName");
  const badgeEl = document.getElementById("platformBadge");

  if (!api || !hostname || !guardrailEnabled) {
    dotEl.className   = "platform-dot inactive";
    nameEl.textContent = hostname || tt("pop_no_platform");
    badgeEl.textContent = "—";
    badgeEl.className  = "platform-badge inactive";
    return;
  }

  const cfg = api.resolveCurrentSiteConfig(hostname, {
    guardrailEnabled: true,
    enabledPlatformIds: syncSnapshot?.enabledPlatformIds,
    customDomains: syncSnapshot?.customDomains,
    userAddedPlatforms: syncSnapshot?.userAddedPlatforms,
  });
  if (cfg) {
    dotEl.className    = "platform-dot";
    nameEl.textContent = cfg.label || cfg.id;
    badgeEl.textContent = tt("pop_protected");
    badgeEl.className  = "platform-badge";
  } else {
    dotEl.className    = "platform-dot inactive";
    nameEl.textContent = hostname;
    badgeEl.textContent = tt("pop_not_monitored");
    badgeEl.className  = "platform-badge inactive";
  }
}

async function checkApiHealth(apiBaseUrl) {
  const base = (apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const res = await checkApiHealthViaBackground();
  if (res.ok) {
    const host = base.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    setStatus("ok", tt("pop_api_ok"), host);
    return;
  }
  if (res.status) {
    setStatus("offline", tt("pop_api_err"), `HTTP ${res.status} · ${base}`);
    return;
  }
  const detail = res.error || "Network error";
  const tried = res.apiBaseUrl || base;
  setStatus("offline", tt("pop_api_unreachable"), `${detail} · ${tried}`);
}

async function init() {
  await readPopupLocale();
  applyPopupI18n();

  const { apiBaseUrl, guardrailEnabled, stats, ...syncSnapshot } = await getSettings();

  // Quick toggle
  const toggle = document.getElementById("quickToggle");
  const disabledBanner = document.getElementById("disabledBanner");
  toggle.checked = guardrailEnabled;
  disabledBanner.style.display = guardrailEnabled ? "none" : "block";

  toggle.addEventListener("change", async () => {
    await chrome.storage.sync.set({ guardrailEnabled: toggle.checked });
    disabledBanner.style.display = toggle.checked ? "none" : "block";
  });

  // Stats
  document.getElementById("statAnalyzed").textContent = stats.analyzed ?? 0;
  document.getElementById("statBlocked").textContent  = stats.blocked  ?? 0;

  // Platform detection
  const hostname = await getCurrentTabHostname();
  updatePlatformUI(hostname, guardrailEnabled, syncSnapshot);

  setStatus("checking", tt("pop_status_connecting"), tt("pop_status_checking"));

  // API health (fires last — UI is already rendered)
  await checkApiHealth(apiBaseUrl);

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "sync" && changes.uiLocale && (changes.uiLocale.newValue === "en" || changes.uiLocale.newValue === "fr")) {
      popupLocale = changes.uiLocale.newValue;
      applyPopupI18n();
      const { apiBaseUrl: url } = await getSettings();
      await checkApiHealth(url);
      const hostname2 = await getCurrentTabHostname();
      const data = await chrome.storage.sync.get(["guardrailEnabled", "enabledPlatformIds", "customDomains", "userAddedPlatforms"]);
      updatePlatformUI(hostname2, data.guardrailEnabled !== false, {
        enabledPlatformIds: Array.isArray(data.enabledPlatformIds) ? data.enabledPlatformIds : [],
        customDomains: Array.isArray(data.customDomains) ? data.customDomains : [],
        userAddedPlatforms: Array.isArray(data.userAddedPlatforms) ? data.userAddedPlatforms : [],
      });
    }
  });
}

init().catch(console.warn);
