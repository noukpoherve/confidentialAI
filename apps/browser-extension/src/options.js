/**
 * Options page logic.
 *
 * Responsibilities:
 * 1. Authentication (login / signup / logout) via the background proxy.
 * 2. Load settings from local chrome.storage.sync (always) + from server (when authenticated).
 * 3. Save settings to chrome.storage.sync (always) + to server (when authenticated).
 * 4. Render built-in platforms grouped by type (AI / social).
 * 5. Manage user-added platforms (add / delete) with per-platform feature flags.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const SETTINGS_KEYS = [
  "apiBaseUrl",
  "guardrailEnabled",
  "autoAnonymize",
  "imageModerationEnabled",
  "enabledPlatformIds",
  "customDomains",        // legacy
  "userAddedPlatforms",   // per-user, server-synced
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

/** Call the API through the background service worker (avoids CORS issues). */
async function apiCall({ method = "GET", path, body, useToken = true }) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "API_CALL", payload: { method, path, body, useToken } },
      (response) => resolve(response || { ok: false, error: "No response" })
    );
  });
}

// ── Toast / notice ────────────────────────────────────────────────────────────

function showNotice(text, isError = false) {
  const el = $("saveNotice");
  const textEl = $("saveNoticeText");
  if (!el || !textEl) return;
  textEl.textContent = text;
  el.classList.toggle("bg-red-700", isError);
  el.classList.toggle("bg-slate-900", !isError);
  el.classList.remove("opacity-0");
  el.classList.add("opacity-100");
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.remove("opacity-100");
    el.classList.add("opacity-0");
  }, 2400);
}

// ── Auth state ────────────────────────────────────────────────────────────────

let authState = { token: null, email: null };

async function loadAuthState() {
  const data = await chrome.storage.local.get(["authToken", "authEmail"]);
  authState.token = data.authToken || null;
  authState.email = data.authEmail || null;
}

async function persistAuthState(token, email) {
  authState.token = token;
  authState.email = email;
  await chrome.storage.local.set({ authToken: token, authEmail: email });
  // Also tell background.js (so it updates its in-memory token immediately).
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "SET_AUTH_TOKEN", token }, resolve);
  });
}

async function clearAuthStateStorage() {
  authState = { token: null, email: null };
  await chrome.storage.local.remove(["authToken", "authEmail"]);
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "CLEAR_AUTH_TOKEN" }, resolve);
  });
}

function renderAuthUI() {
  const formArea = $("authFormArea");
  const loggedInArea = $("authLoggedInArea");
  const emailEl = $("authUserEmail");
  const badge = $("authRequiredBadge");

  if (authState.token) {
    formArea?.classList.add("hidden");
    loggedInArea?.classList.remove("hidden");
    if (emailEl) emailEl.textContent = authState.email || "";
    if (badge) badge.classList.add("hidden");
  } else {
    formArea?.classList.remove("hidden");
    loggedInArea?.classList.add("hidden");
    if (badge) badge.classList.remove("hidden");
  }
}

async function doAuthRequest(endpoint) {
  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;
  const errorEl = $("authError");

  if (!email || !password) {
    if (errorEl) { errorEl.textContent = "Please fill in email and password."; errorEl.classList.remove("hidden"); }
    return;
  }
  if (errorEl) errorEl.classList.add("hidden");

  const res = await apiCall({
    method: "POST",
    path: endpoint,
    body: { email, password },
    useToken: false,
  });

  if (!res.ok) {
    const msg = res.data?.detail || res.error || "Authentication failed.";
    if (errorEl) { errorEl.textContent = msg; errorEl.classList.remove("hidden"); }
    return;
  }

  await persistAuthState(res.data.accessToken, res.data.user?.email || email);
  renderAuthUI();

  // After login, pull server settings and merge into local storage.
  await syncSettingsFromServer();
  await restore();
  showNotice("Logged in. Settings synced from your account.");
}

async function doLogout() {
  await clearAuthStateStorage();
  renderAuthUI();
  showNotice("Logged out.");
}

// ── Server settings sync ──────────────────────────────────────────────────────

/** Pull server settings and write them into chrome.storage.sync. */
async function syncSettingsFromServer() {
  if (!authState.token) return;
  const res = await apiCall({ method: "GET", path: "/v1/users/me/settings" });
  if (!res.ok) return;

  const s = res.data;
  const patch = {};
  if (typeof s.guardrailEnabled === "boolean") patch.guardrailEnabled = s.guardrailEnabled;
  if (typeof s.autoAnonymize === "boolean") patch.autoAnonymize = s.autoAnonymize;
  if (typeof s.imageModerationEnabled === "boolean") patch.imageModerationEnabled = s.imageModerationEnabled;
  if (Array.isArray(s.enabledPlatformIds)) patch.enabledPlatformIds = s.enabledPlatformIds;
  if (Array.isArray(s.customDomains)) patch.customDomains = s.customDomains;
  if (Array.isArray(s.userAddedPlatforms)) patch.userAddedPlatforms = s.userAddedPlatforms;

  await chrome.storage.sync.set(patch);
}

/** Push current local settings to the server (called on Save when logged in). */
async function syncSettingsToServer(payload) {
  if (!authState.token) return;
  await apiCall({
    method: "PUT",
    path: "/v1/users/me/settings",
    body: payload,
  });
}

// ── Platform rendering ────────────────────────────────────────────────────────

let enabledPlatformIds = [];

function renderPlatforms(enabledIds) {
  enabledPlatformIds = Array.isArray(enabledIds) ? enabledIds : [];

  const aiContainer = $("platformsAI");
  const socialContainer = $("platformsSocial");
  if (!aiContainer || !socialContainer) return;

  aiContainer.innerHTML = "";
  socialContainer.innerHTML = "";

  const siteConfigs = window.ConfidentialAgentSiteConfigs?.SITE_CONFIGS || [];
  for (const platform of siteConfigs) {
    const isChecked = enabledPlatformIds.length === 0 || enabledPlatformIds.includes(platform.id);
    const item = document.createElement("label");
    item.className = `flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer select-none transition-colors ${
      isChecked ? "bg-indigo-50 border border-indigo-200" : "bg-slate-50 border border-slate-100 hover:bg-slate-100"
    }`;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = platform.id;
    cb.checked = isChecked;
    cb.className = "w-3.5 h-3.5 accent-indigo-600 cursor-pointer shrink-0";
    cb.addEventListener("change", () => {
      if (cb.checked) {
        if (!enabledPlatformIds.includes(platform.id)) enabledPlatformIds.push(platform.id);
      } else {
        enabledPlatformIds = enabledPlatformIds.filter((id) => id !== platform.id);
      }
      item.className = `flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer select-none transition-colors ${
        cb.checked ? "bg-indigo-50 border border-indigo-200" : "bg-slate-50 border border-slate-100 hover:bg-slate-100"
      }`;
    });

    const dot = document.createElement("span");
    dot.className = `w-1.5 h-1.5 rounded-full shrink-0 ${isChecked ? "bg-indigo-500" : "bg-slate-300"}`;

    const lbl = document.createElement("span");
    lbl.className = `text-[12px] font-semibold flex-1 ${isChecked ? "text-indigo-700" : "text-slate-700"}`;
    lbl.textContent = platform.label || platform.id;

    // Feature badges
    const badges = document.createElement("div");
    badges.className = "flex gap-1 shrink-0";
    if (platform.features?.includes("imageModeration")) {
      const b = document.createElement("span");
      b.textContent = "IMG";
      b.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200";
      badges.appendChild(b);
    }
    if (platform.features?.includes("textAnalysis")) {
      const b = document.createElement("span");
      b.textContent = "TXT";
      b.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200";
      badges.appendChild(b);
    }

    item.append(cb, dot, lbl, badges);

    if (platform.type === "social") {
      socialContainer.appendChild(item);
    } else {
      aiContainer.appendChild(item);
    }
  }
}

// ── User-added platforms ──────────────────────────────────────────────────────

let userAddedPlatforms = [];

function renderUserAddedPlatforms() {
  const list = $("userAddedPlatformsList");
  const empty = $("userAddedEmpty");
  if (!list) return;

  list.innerHTML = "";
  if (userAddedPlatforms.length === 0) {
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");

  for (const platform of userAddedPlatforms) {
    const row = document.createElement("div");
    row.className = "flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 border border-teal-200";

    const info = document.createElement("div");
    info.className = "flex-1 min-w-0";

    const labelEl = document.createElement("div");
    labelEl.className = "text-[12.5px] font-semibold text-teal-800 truncate";
    labelEl.textContent = platform.label || platform.domain;

    const domainEl = document.createElement("div");
    domainEl.className = "text-[11px] text-teal-600 font-mono truncate";
    domainEl.textContent = platform.domain;

    info.append(labelEl, domainEl);

    // Feature badges
    const badges = document.createElement("div");
    badges.className = "flex gap-1 shrink-0";
    if (platform.features?.includes("textAnalysis")) {
      const b = document.createElement("span");
      b.textContent = "TXT";
      b.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200";
      badges.appendChild(b);
    }
    if (platform.features?.includes("imageModeration")) {
      const b = document.createElement("span");
      b.textContent = "IMG";
      b.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200";
      badges.appendChild(b);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.title = "Remove";
    deleteBtn.className = "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-teal-100 transition-colors text-teal-500 hover:text-red-500 shrink-0";
    deleteBtn.innerHTML = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    deleteBtn.addEventListener("click", () => {
      userAddedPlatforms = userAddedPlatforms.filter((p) => p.id !== platform.id);
      renderUserAddedPlatforms();
    });

    row.append(info, badges, deleteBtn);
    list.appendChild(row);
  }
}

function addUserPlatform() {
  const domainInput = $("newPlatformDomain");
  const labelInput = $("newPlatformLabel");
  const textAnalysisCb = $("newPlatformTextAnalysis");
  const imageModCb = $("newPlatformImageMod");
  const errorEl = $("addPlatformError");

  const rawDomain = domainInput?.value.trim();
  if (!rawDomain) {
    if (errorEl) { errorEl.textContent = "Please enter a domain (e.g. example.com)."; errorEl.classList.remove("hidden"); }
    return;
  }
  if (errorEl) errorEl.classList.add("hidden");

  const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").toLowerCase();
  if (userAddedPlatforms.some((p) => p.domain === domain)) {
    if (errorEl) { errorEl.textContent = "This domain is already in your list."; errorEl.classList.remove("hidden"); }
    return;
  }

  const features = [];
  if (textAnalysisCb?.checked) features.push("textAnalysis");
  if (imageModCb?.checked) features.push("imageModeration");
  if (features.length === 0) features.push("textAnalysis");

  const newPlatform = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: labelInput?.value.trim() || domain,
    domain,
    features,
  };

  userAddedPlatforms.push(newPlatform);
  renderUserAddedPlatforms();

  if (domainInput) domainInput.value = "";
  if (labelInput) labelInput.value = "";
}

// ── Restore ───────────────────────────────────────────────────────────────────

async function restore() {
  const data = await chrome.storage.sync.get(SETTINGS_KEYS);

  const apiUrl = $("apiBaseUrl");
  if (apiUrl) apiUrl.value = data.apiBaseUrl || "http://localhost:8080";

  const guardrailEl = $("guardrailEnabled");
  if (guardrailEl) guardrailEl.checked = data.guardrailEnabled !== false;

  const autoAnonEl = $("autoAnonymize");
  if (autoAnonEl) autoAnonEl.checked = data.autoAnonymize === true;

  const imgModEl = $("imageModerationEnabled");
  if (imgModEl) imgModEl.checked = data.imageModerationEnabled !== false;

  const savedEnabledIds = Array.isArray(data.enabledPlatformIds) ? data.enabledPlatformIds : [];
  renderPlatforms(savedEnabledIds);

  userAddedPlatforms = Array.isArray(data.userAddedPlatforms) ? data.userAddedPlatforms : [];
  renderUserAddedPlatforms();
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
  const apiUrl = $("apiBaseUrl")?.value.trim() || "http://localhost:8080";
  const guardrailEnabled = $("guardrailEnabled")?.checked !== false;
  const autoAnonymize = $("autoAnonymize")?.checked === true;
  const imageModerationEnabled = $("imageModerationEnabled")?.checked !== false;

  const payload = {
    apiBaseUrl: apiUrl,
    guardrailEnabled,
    autoAnonymize,
    imageModerationEnabled,
    enabledPlatformIds: enabledPlatformIds,
    userAddedPlatforms,
    // Legacy field: keep compatible with older code by deriving from userAddedPlatforms.
    customDomains: userAddedPlatforms.map((p) => p.domain),
  };

  await chrome.storage.sync.set(payload);

  if (authState.token) {
    await syncSettingsToServer(payload);
    showNotice("Settings saved & synced to your account.");
  } else {
    showNotice("Settings saved locally.");
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  await loadAuthState();
  renderAuthUI();

  // If already authenticated, pull server settings first.
  if (authState.token) {
    await syncSettingsFromServer();
  }

  await restore();

  // ── Bind events ─────────────────────────────────────────────────────────────
  $("saveBtn")?.addEventListener("click", save);

  $("loginBtn")?.addEventListener("click", () => doAuthRequest("/v1/auth/login"));
  $("signupBtn")?.addEventListener("click", () => doAuthRequest("/v1/auth/signup"));
  $("logoutBtn")?.addEventListener("click", doLogout);

  // Allow Enter key in auth fields.
  const authEnter = (e) => { if (e.key === "Enter") doAuthRequest("/v1/auth/login"); };
  $("authEmail")?.addEventListener("keydown", authEnter);
  $("authPassword")?.addEventListener("keydown", authEnter);

  $("addPlatformBtn")?.addEventListener("click", addUserPlatform);
  $("newPlatformDomain")?.addEventListener("keydown", (e) => { if (e.key === "Enter") addUserPlatform(); });
}

document.addEventListener("DOMContentLoaded", init);
