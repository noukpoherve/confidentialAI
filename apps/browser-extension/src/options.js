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

const API_URL_LOCAL = "http://localhost:8080";
const API_URL_PRODUCTION = "https://confidentialai.koyeb.app";

/**
 * How we choose "development" vs "production" API preset UI:
 * 1. Optional override: `globalThis.__CONFIDENTIAL_AGENT_BUILD__` === "production" | "development"
 * 2. Else `chrome.management.getSelf()`: installType "development" = unpacked → dev UI; store/sideload/etc. → prod UI
 * 3. Else fallback "development" (safe default if the API is unavailable)
 */
/** @type {"development" | "production" | null} */
let resolvedApiPresetProfile = null;

async function resolveApiPresetProfile() {
  if (resolvedApiPresetProfile) return resolvedApiPresetProfile;

  const override = globalThis.__CONFIDENTIAL_AGENT_BUILD__;
  if (override === "production" || override === "development") {
    resolvedApiPresetProfile = override;
    return resolvedApiPresetProfile;
  }

  try {
    const info = await new Promise((resolve, reject) => {
      if (!chrome.management?.getSelf) {
        reject(new Error("management API missing"));
        return;
      }
      chrome.management.getSelf((i) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(i);
      });
    });
    resolvedApiPresetProfile = info.installType === "development" ? "development" : "production";
  } catch {
    resolvedApiPresetProfile = "development";
  }
  return resolvedApiPresetProfile;
}

function defaultApiBaseUrlForBuild() {
  return resolvedApiPresetProfile === "production" ? API_URL_PRODUCTION : API_URL_LOCAL;
}

function applyApiPresetButtonsVisibility() {
  const localBtn = $("useLocalApiBtn");
  if (!localBtn) return;
  if (resolvedApiPresetProfile === "production") {
    localBtn.classList.add("hidden");
  } else {
    localBtn.classList.remove("hidden");
  }
}

const SETTINGS_KEYS = [
  "apiBaseUrl",
  "guardrailEnabled",
  "autoAnonymize",
  "contentModerationEnabled",
  "responseModerationEnabled",
  "avsRevealBlurred",
  "imageModerationEnabled",
  "enabledPlatformIds",
  "customDomains",        // legacy
  "userAddedPlatforms",   // per-user, server-synced
  "uiLocale",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

const I18n = globalThis.ConfidentialAgentI18n;

function tt(key, vars) {
  const loc = currentUiLocale || "en";
  return I18n.t(key, loc, vars);
}

/** @type {string} */
let currentUiLocale = "en";

async function readUiLocale() {
  const raw = await I18n.getUiLocale();
  currentUiLocale = I18n.normalizeLocale(raw);
  return currentUiLocale;
}

function applyOptionsPageI18n() {
  I18n.applyDocumentI18n(document, currentUiLocale);
  const sel = $("uiLocaleSelect");
  if (sel) {
    sel.value = currentUiLocale;
    const oEn = sel.querySelector('option[value="en"]');
    const oFr = sel.querySelector('option[value="fr"]');
    if (oEn) oEn.textContent = tt("language_en");
    if (oFr) oFr.textContent = tt("language_fr");
  }
  document.title = tt("opt_page_title");
  updateActiveUrlHint();
}

/** Call the API through the background service worker (avoids CORS issues). */
async function apiCall({ method = "GET", path, body, useToken = true }) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "API_CALL", payload: { method, path, body, useToken } },
      (response) => resolve(response || { ok: false, error: "No response" })
    );
  });
}

function inferApiPreset(raw) {
  try {
    const u = new URL((raw || "").trim() || defaultApiBaseUrlForBuild());
    const h = u.hostname.toLowerCase();
    if ((h === "localhost" || h === "127.0.0.1") && u.port === "8080" && u.protocol === "http:") {
      return "local";
    }
    if (h === "confidentialai.koyeb.app" && u.protocol === "https:") {
      return "production";
    }
    return "custom";
  } catch {
    return "custom";
  }
}

function isBuiltInApiUrl(apiBaseUrl) {
  return inferApiPreset(apiBaseUrl) !== "custom";
}

/**
 * Custom backends need runtime host permission (declared as optional_host_permissions in the manifest).
 */
async function ensureHostPermissionIfNeeded(apiBaseUrl) {
  if (isBuiltInApiUrl(apiBaseUrl)) return { ok: true };
  let u;
  try {
    u = new URL(apiBaseUrl.trim());
  } catch {
    return { ok: false, error: tt("opt_invalid_url") };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: tt("opt_url_scheme") };
  }
  const origin = `${u.protocol}//${u.host}`;
  const perm = { origins: [`${origin}/*`] };
  try {
    if (await chrome.permissions.contains(perm)) return { ok: true };
    const granted = await chrome.permissions.request(perm);
    return granted
      ? { ok: true }
      : { ok: false, error: tt("opt_perm_denied") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : tt("opt_perm_error") };
  }
}

function updateActiveUrlHint() {
  const el = $("activeApiUrlHint");
  const labelEl = $("apiPresetLabel");
  const input = $("apiBaseUrl");
  if (!input) return;
  const url = input.value.trim().replace(/\/+$/, "") || defaultApiBaseUrlForBuild();
  if (el) el.textContent = tt("opt_active_base", { url });
  if (labelEl) {
    const preset = inferApiPreset(input.value);
    const lines = {
      local: tt("opt_env_local"),
      production: tt("opt_env_production"),
      custom: tt("opt_env_custom"),
    };
    labelEl.textContent = lines[preset];
  }
}

function syncApiUrlUi() {
  updateActiveUrlHint();
}

function updateContentModerationVisualState() {
  const enabled = $("contentModerationEnabled")?.checked !== false;
  const section = $("contentModerationSection");
  const header = $("contentModerationHeader");
  const headerIconWrap = $("contentModerationHeaderIconWrap");
  const headerIcon = $("contentModerationHeaderIcon");
  const note = $("contentModerationNote");
  const noteIcon = $("contentModerationNoteIcon");
  const switchTrack = $("contentModerationSwitchTrack");
  const switchThumb = $("contentModerationSwitchThumb");

  if (section) {
    section.classList.toggle("border-cyan-300", enabled);
    section.classList.toggle("border-slate-200", !enabled);
  }
  if (header) {
    header.classList.toggle("bg-cyan-50", enabled);
  }
  if (headerIconWrap) {
    headerIconWrap.style.backgroundColor = "transparent";
    headerIconWrap.style.boxShadow = "none";
  }
  if (headerIcon) {
    headerIcon.classList.toggle("text-indigo-700", enabled);
    headerIcon.classList.toggle("text-indigo-500", !enabled);
    headerIcon.style.opacity = "1";
    headerIcon.style.transform = "none";
  }
  if (note) {
    note.classList.toggle("border-cyan-200", enabled);
    note.classList.toggle("bg-cyan-50", enabled);
    note.classList.toggle("border-slate-200", !enabled);
    note.classList.toggle("bg-slate-50", !enabled);
  }
  if (noteIcon) {
    noteIcon.classList.toggle("stroke-indigo-600", enabled);
    noteIcon.classList.toggle("stroke-slate-400", !enabled);
    noteIcon.style.opacity = enabled ? "1" : "0.75";
  }
  // Force visible ON/OFF switch colors regardless of Tailwind build cache.
  if (switchTrack) {
    switchTrack.style.backgroundColor = enabled ? "#4f46e5" : "#e2e8f0";
    switchTrack.style.boxShadow = enabled ? "0 0 0 2px rgba(79,70,229,0.28)" : "none";
  }
  if (switchThumb) {
    switchThumb.style.backgroundColor = enabled ? "#e0e7ff" : "#ffffff";
    switchThumb.style.boxShadow = enabled ? "inset 0 0 0 1px rgba(199,210,254,0.9)" : "none";
  }
}

async function testApiConnection() {
  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "HEALTH_CHECK" }, (r) => resolve(r || { ok: false, error: "No response" }));
  });
  if (res.ok) {
    showNotice(tt("opt_conn_ok"));
  } else {
    const msg = res.error || (res.status ? `HTTP ${res.status}` : "Unreachable");
    showNotice(tt("opt_conn_fail", { msg }), true);
  }
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
    if (errorEl) { errorEl.textContent = tt("opt_fill_auth"); errorEl.classList.remove("hidden"); }
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
  showNotice(tt("opt_logged_in"));
}

async function doLogout() {
  await clearAuthStateStorage();
  renderAuthUI();
  showNotice(tt("opt_logged_out"));
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
  if (typeof s.contentModerationEnabled === "boolean") patch.contentModerationEnabled = s.contentModerationEnabled;
  if (typeof s.responseModerationEnabled === "boolean") patch.responseModerationEnabled = s.responseModerationEnabled;
  if (typeof s.avsRevealBlurred === "boolean") patch.avsRevealBlurred = s.avsRevealBlurred;
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
      b.textContent = tt("opt_badge_img");
      b.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200";
      badges.appendChild(b);
    }
    if (platform.features?.includes("textAnalysis")) {
      const b = document.createElement("span");
      b.textContent = tt("opt_badge_txt");
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
    labelEl.textContent =
      platform.label
      || (platform.pathPrefix ? `${platform.domain}${platform.pathPrefix}` : platform.domain);

    const domainEl = document.createElement("div");
    domainEl.className = "text-[11px] text-teal-600 font-mono truncate";
    domainEl.textContent = platform.pathPrefix
      ? `${platform.domain}${platform.pathPrefix}`
      : platform.domain;

    info.append(labelEl, domainEl);

    // Feature badges
    const badges = document.createElement("div");
    badges.className = "flex gap-1 shrink-0";
    if (platform.features?.includes("textAnalysis")) {
      const b = document.createElement("span");
      b.textContent = tt("opt_badge_txt");
      b.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200";
      badges.appendChild(b);
    }
    if (platform.features?.includes("imageModeration")) {
      const b = document.createElement("span");
      b.textContent = tt("opt_badge_img");
      b.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200";
      badges.appendChild(b);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.title = tt("opt_remove_title");
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
    if (errorEl) { errorEl.textContent = tt("opt_domain_empty"); errorEl.classList.remove("hidden"); }
    return;
  }
  if (errorEl) errorEl.classList.add("hidden");

  const Site = globalThis.ConfidentialAgentSiteConfigs;
  const parsed = Site?.parseUserSiteInput ? Site.parseUserSiteInput(rawDomain) : null;
  if (!parsed || !parsed.ok) {
    if (errorEl) { errorEl.textContent = tt("opt_domain_invalid"); errorEl.classList.remove("hidden"); }
    return;
  }
  const { host: domain, pathPrefix, display } = parsed;
  const dup = userAddedPlatforms.some(
    (p) => p.domain === domain && (p.pathPrefix || null) === (pathPrefix || null)
  );
  if (dup) {
    if (errorEl) { errorEl.textContent = tt("opt_domain_dup"); errorEl.classList.remove("hidden"); }
    return;
  }

  const features = [];
  if (textAnalysisCb?.checked) features.push("textAnalysis");
  if (imageModCb?.checked) features.push("imageModeration");
  if (features.length === 0) features.push("textAnalysis");

  const newPlatform = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: labelInput?.value.trim() || display,
    domain,
    ...(pathPrefix ? { pathPrefix } : {}),
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

  const locSel = $("uiLocaleSelect");
  if (locSel) {
    if (data.uiLocale === "en" || data.uiLocale === "fr") {
      currentUiLocale = data.uiLocale;
    }
    locSel.value = currentUiLocale;
  }

  const apiUrl = $("apiBaseUrl");
  if (apiUrl) apiUrl.value = data.apiBaseUrl || defaultApiBaseUrlForBuild();
  syncApiUrlUi();

  const guardrailEl = $("guardrailEnabled");
  if (guardrailEl) guardrailEl.checked = data.guardrailEnabled !== false;

  const autoAnonEl = $("autoAnonymize");
  if (autoAnonEl) autoAnonEl.checked = data.autoAnonymize === true;

  const imgModEl = $("imageModerationEnabled");
  if (imgModEl) imgModEl.checked = data.imageModerationEnabled !== false;

  const textModEl = $("contentModerationEnabled");
  if (textModEl) textModEl.checked = data.contentModerationEnabled !== false;
  updateContentModerationVisualState();

  const respModEl = $("responseModerationEnabled");
  if (respModEl) respModEl.checked = data.responseModerationEnabled !== false;
  const avsRevealEl = $("avsRevealBlurred");
  if (avsRevealEl) avsRevealEl.checked = data.avsRevealBlurred === true;

  const savedEnabledIds = Array.isArray(data.enabledPlatformIds) ? data.enabledPlatformIds : [];
  renderPlatforms(savedEnabledIds);

  userAddedPlatforms = Array.isArray(data.userAddedPlatforms) ? data.userAddedPlatforms : [];
  renderUserAddedPlatforms();
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
  const apiUrl = $("apiBaseUrl")?.value.trim().replace(/\/+$/, "") || defaultApiBaseUrlForBuild();
  const guardrailEnabled = $("guardrailEnabled")?.checked !== false;
  const autoAnonymize = $("autoAnonymize")?.checked === true;
  const contentModerationEnabled = $("contentModerationEnabled")?.checked !== false;
  const responseModerationEnabled = $("responseModerationEnabled")?.checked !== false;
  const avsRevealBlurred = $("avsRevealBlurred")?.checked === true;
  const imageModerationEnabled = $("imageModerationEnabled")?.checked !== false;

  const perm = await ensureHostPermissionIfNeeded(apiUrl);
  if (!perm.ok) {
    showNotice(perm.error || tt("opt_save_perm_fail"), true);
    return;
  }

  const payload = {
    apiBaseUrl: apiUrl,
    guardrailEnabled,
    autoAnonymize,
    contentModerationEnabled,
    responseModerationEnabled,
    avsRevealBlurred,
    imageModerationEnabled,
    enabledPlatformIds: enabledPlatformIds,
    userAddedPlatforms,
    // Legacy field: keep compatible with older code by deriving from userAddedPlatforms.
    customDomains: userAddedPlatforms.map((p) => p.domain),
  };

  await chrome.storage.sync.set({ ...payload, uiLocale: currentUiLocale });

  if (authState.token) {
    await syncSettingsToServer(payload);
    showNotice(tt("opt_saved_synced"));
  } else {
    showNotice(tt("opt_saved_local"));
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  if (!I18n) {
    console.warn("ConfidentialAgentI18n missing");
    return;
  }
  await readUiLocale();
  await resolveApiPresetProfile();
  await loadAuthState();
  renderAuthUI();

  // If already authenticated, pull server settings first.
  if (authState.token) {
    await syncSettingsFromServer();
  }

  applyApiPresetButtonsVisibility();
  await restore();
  applyOptionsPageI18n();

  $("uiLocaleSelect")?.addEventListener("change", async (e) => {
    const v = e.target && "value" in e.target ? String(e.target.value) : "en";
    currentUiLocale = v === "fr" ? "fr" : "en";
    await chrome.storage.sync.set({ uiLocale: currentUiLocale });
    applyOptionsPageI18n();
    renderPlatforms(enabledPlatformIds);
    renderUserAddedPlatforms();
  });

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

  $("useLocalApiBtn")?.addEventListener("click", async () => {
    const input = $("apiBaseUrl");
    if (input) input.value = API_URL_LOCAL;
    syncApiUrlUi();
    // Persist immediately so the content script uses localhost without a separate Save click.
    await chrome.storage.sync.set({ apiBaseUrl: API_URL_LOCAL });
    showNotice(tt("opt_notice_local_saved"));
  });
  $("useProdApiBtn")?.addEventListener("click", async () => {
    const input = $("apiBaseUrl");
    if (input) input.value = API_URL_PRODUCTION;
    syncApiUrlUi();
    await chrome.storage.sync.set({ apiBaseUrl: API_URL_PRODUCTION });
    showNotice(tt("opt_notice_prod_saved"));
  });
  $("apiBaseUrl")?.addEventListener("input", syncApiUrlUi);
  $("apiBaseUrl")?.addEventListener("change", syncApiUrlUi);
  $("contentModerationEnabled")?.addEventListener("change", updateContentModerationVisualState);
  $("testConnectionBtn")?.addEventListener("click", () => { testApiConnection().catch(console.warn); });
}

document.addEventListener("DOMContentLoaded", init);
