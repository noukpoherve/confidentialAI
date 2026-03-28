const DEFAULT_API_BASE_URL = "http://localhost:8080";

async function getSettings() {
  const data = await chrome.storage.sync.get(["apiBaseUrl", "guardrailEnabled"]);
  const local = await chrome.storage.local.get(["stats"]);
  return {
    apiBaseUrl: data.apiBaseUrl || DEFAULT_API_BASE_URL,
    guardrailEnabled: data.guardrailEnabled !== false,
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

function updatePlatformUI(hostname, guardrailEnabled) {
  const api = window.ConfidentialAgentSiteConfigs;
  const dotEl   = document.getElementById("platformDot");
  const nameEl  = document.getElementById("platformName");
  const badgeEl = document.getElementById("platformBadge");

  if (!api || !hostname || !guardrailEnabled) {
    dotEl.className   = "platform-dot inactive";
    nameEl.textContent = hostname || "No AI platform detected";
    badgeEl.textContent = "—";
    badgeEl.className  = "platform-badge inactive";
    return;
  }

  const cfg = api.resolveCurrentSiteConfig(hostname, { guardrailEnabled: true });
  if (cfg) {
    dotEl.className    = "platform-dot";
    nameEl.textContent = cfg.label || cfg.id;
    badgeEl.textContent = "Protected";
    badgeEl.className  = "platform-badge";
  } else {
    dotEl.className    = "platform-dot inactive";
    nameEl.textContent = hostname;
    badgeEl.textContent = "Not monitored";
    badgeEl.className  = "platform-badge inactive";
  }
}

async function checkApiHealth(apiBaseUrl) {
  try {
    const res = await fetch(`${apiBaseUrl}/health`, {
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const host = apiBaseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      setStatus("ok", "API Connected", host);
    } else {
      setStatus("offline", "API Error", `HTTP ${res.status}`);
    }
  } catch {
    setStatus("offline", "API Unreachable", "Check settings or network");
  }
}

async function init() {
  const { apiBaseUrl, guardrailEnabled, stats } = await getSettings();

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
  updatePlatformUI(hostname, guardrailEnabled);

  // API health (fires last — UI is already rendered)
  await checkApiHealth(apiBaseUrl);
}

init().catch(console.warn);
