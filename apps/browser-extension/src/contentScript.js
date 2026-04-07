(async function bootstrap() {
  const siteConfigApi = window.ConfidentialAgentSiteConfigs;
  const redactorApi = window.ConfidentialAgentRedactor;

  if (!siteConfigApi || !redactorApi) {
    return;
  }

  const I18n = globalThis.ConfidentialAgentI18n;
  if (!I18n) {
    return;
  }
  let uiLocale = I18n.normalizeLocale(await I18n.getUiLocale());
  const __ = (key, vars) => I18n.t(key, uiLocale, vars);

  function mapDetectionTypeToAwarenessKey(type) {
    const t = String(type || "").toUpperCase();
    if (!t) return null;
    if (t === "TOXIC_LANGUAGE") return "toxicity";
    if (t === "IMAGE_SEXUAL_MINORS") return "image_sexual_minors";
    if (t === "IMAGE_SEXUAL" || t === "IMAGE_PARTIAL_NUDITY") return "image_sexual";
    if (t.includes("HARASSMENT")) return "harassment";
    const dataPrivacyTypes = new Set([
      "EMAIL",
      "PHONE",
      "IBAN",
      "API_KEY",
      "PASSWORD",
      "TOKEN",
      "INTERNAL_URL",
      "SOURCE_CODE",
      "LEGAL_HR",
      "HARMFUL_URL",
      "URL_CONFIDENTIELLE",
    ]);
    if (dataPrivacyTypes.has(t) || t.startsWith("LLM_")) return "data_privacy";
    return null;
  }

  function pickAwarenessKeyFromDetections(detections) {
    const keys = [];
    const seen = new Set();
    for (const d of detections || []) {
      const k = mapDetectionTypeToAwarenessKey(d.type);
      if (k && !seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
    const priority = [
      "image_sexual_minors",
      "image_sexual",
      "harassment",
      "toxicity",
      "data_privacy",
    ];
    for (const p of priority) {
      if (keys.includes(p)) return p;
    }
    return keys[0] || null;
  }

  /**
   * Awareness copy uses the same I18n pipeline as the rest of the modal (`__` + uiLocale).
   */
  function appendAwarenessSection(container, detections, scrollTargetGetter) {
    const detectionTypeKey = pickAwarenessKeyFromDetections(detections);
    if (!detectionTypeKey) return;
    const base = `awareness_${detectionTypeKey}_`;
    const msgKey = `${base}message`;
    const message = __(msgKey);
    if (!message || message === msgKey) return;

    const box = document.createElement("div");
    Object.assign(box.style, {
      marginTop: "12px",
      padding: "12px",
      background: "#f8fafc",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
    });

    const pMsg = document.createElement("p");
    Object.assign(pMsg.style, {
      margin: "0 0 8px 0",
      fontSize: "12px",
      lineHeight: "1.55",
      color: "#334155",
    });
    pMsg.textContent = message;

    const pLegal = document.createElement("p");
    Object.assign(pLegal.style, {
      margin: "0 0 8px 0",
      fontSize: "12px",
      lineHeight: "1.55",
      color: "#475569",
    });
    pLegal.textContent = __(base + "legal");

    const pDisc = document.createElement("p");
    Object.assign(pDisc.style, {
      margin: "0 0 0 0",
      fontSize: "11px",
      lineHeight: "1.5",
      color: "#64748b",
    });
    pDisc.textContent = __(base + "disclaimer");

    box.append(pMsg, pLegal, pDisc);

    const ctaText = String(__(base + "cta") || "").trim();
    if (ctaText) {
      const ctaBtn = document.createElement("button");
      ctaBtn.type = "button";
      ctaBtn.textContent = ctaText;
      Object.assign(ctaBtn.style, {
        marginTop: "10px",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "11px",
        fontWeight: "600",
        cursor: "pointer",
        border: "1px solid #cbd5e1",
        background: "#fff",
        color: "#334155",
        display: "inline-block",
      });
      ctaBtn.addEventListener("click", () => {
        const el =
          typeof scrollTargetGetter === "function" ? scrollTargetGetter() : scrollTargetGetter;
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
      box.appendChild(ctaBtn);
    }

    container.appendChild(box);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (
      area === "sync" &&
      changes.uiLocale &&
      (changes.uiLocale.newValue === "en" || changes.uiLocale.newValue === "fr")
    ) {
      uiLocale = I18n.normalizeLocale(changes.uiLocale.newValue);
    }
  });

  async function loadUserSiteSettings() {
    try {
      const data = await chrome.storage.sync.get([
        "guardrailEnabled",
        "contentModerationEnabled",
        "enabledPlatformIds",
        "customDomains",
        "userAddedPlatforms",
      ]);
      return {
        guardrailEnabled: data.guardrailEnabled !== false,
        contentModerationEnabled: data.contentModerationEnabled !== false,
        enabledPlatformIds: Array.isArray(data.enabledPlatformIds) ? data.enabledPlatformIds : [],
        customDomains: Array.isArray(data.customDomains) ? data.customDomains : [],
        // Server-synced, per-user platforms
        userAddedPlatforms: Array.isArray(data.userAddedPlatforms) ? data.userAddedPlatforms : [],
      };
    } catch (_error) {
      return {
        guardrailEnabled: true,
        contentModerationEnabled: true,
        enabledPlatformIds: [],
        customDomains: [],
        userAddedPlatforms: [],
      };
    }
  }

  let currentSiteConfig = null;
  let contentModerationEnabled = true;
  async function refreshCurrentSiteConfig() {
    const userSiteSettings = await loadUserSiteSettings();
    contentModerationEnabled = userSiteSettings.contentModerationEnabled !== false;
    currentSiteConfig = siteConfigApi.resolveCurrentSiteConfig(
      {
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        href: window.location.href,
      },
      userSiteSettings
    );
  }
  await refreshCurrentSiteConfig();
  let replayingSubmission = false;
  const analyzedResponseHashes = new Set();
  let responseScanTimer = null;
  let promptModalOpen = false;
  let extensionContextInvalid = false;
  let domObserver = null;
  let extensionReloadNoticeShown = false;
  let manualWarnBypassHash = null;
  const sentSiteSignals = new Set();
  /** Last field the user focused — used when submit is a click and activeElement is not the composer. */
  let lastFocusedPrompt = null;

  // ── Blocked-image state ──────────────────────────────────────────────────
  // Set to true when image moderation returns BLOCK so that the Post/Send
  // button is intercepted even if the user bypasses the modal.
  let blockedImagePending = false;
  let pendingBlockBanner = null;

  function clearBlockedImagePending() {
    blockedImagePending = false;
    if (pendingBlockBanner) {
      pendingBlockBanner.remove();
      pendingBlockBanner = null;
    }
  }

  function showBlockedImageBanner() {
    if (pendingBlockBanner) return;
    const banner = document.createElement("div");
    banner.dataset.confidentialAgentBlockBanner = "true";
    Object.assign(banner.style, {
      position: "fixed", top: "0", left: "0", right: "0", zIndex: "2147483646",
      background: "#dc2626", color: "#fff",
      padding: "11px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      fontSize: "13px", fontWeight: "600",
      boxShadow: "0 2px 12px rgba(220,38,38,0.4)",
      animation: "ca-slide-in 0.2s ease",
    });
    const msg = Object.assign(document.createElement("span"), {
      textContent: __("cs_flagged_image_banner"),
    });
    const dismissBtn = document.createElement("button");
    dismissBtn.textContent = __("cs_unlock_send");
    Object.assign(dismissBtn.style, {
      background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.55)",
      color: "#fff", padding: "5px 14px", borderRadius: "7px",
      cursor: "pointer", fontWeight: "700", fontSize: "12px", flexShrink: "0",
    });
    dismissBtn.addEventListener("click", clearBlockedImagePending);
    banner.append(msg, dismissBtn);
    document.body.prepend(banner);
    pendingBlockBanner = banner;
  }

  function getActiveSiteConfig() {
    return currentSiteConfig;
  }

  async function reportSiteSignal(eventType, details = "") {
    const cfg = getActiveSiteConfig();
    const hostname = window.location.hostname || "unknown";
    const key = `${eventType}:${hostname}:${cfg?.id || "unknown"}`;
    if (sentSiteSignals.has(key)) return;
    sentSiteSignals.add(key);
    await safeSendMessage({
      type: "SIGNAL_SITE_ISSUE",
      payload: {
        eventType,
        hostname,
        pageUrl: window.location.href,
        platformId: cfg?.id || "unknown",
        details,
      },
    });
  }

  function isVisibleElement(el) {
    if (!(el instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    const r = el.getBoundingClientRect();
    return r.width >= 4 && r.height >= 4;
  }

  function isPromptLikeElement(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el instanceof HTMLTextAreaElement) return !el.readOnly;
    if (el instanceof HTMLInputElement) {
      const t = (el.type || "text").toLowerCase();
      if (!["text", "search", "email", "url", ""].includes(t)) return false;
      return !el.readOnly;
    }
    if (el.getAttribute("contenteditable") === "true") return true;
    if (el.tagName === "RICH-TEXTAREA") return true;
    if (el.getAttribute("role") === "textbox") return true;
    return false;
  }

  const MAX_SHADOW_DEPTH = 12;
  function queryPromptInShadowTree(selectors, root, depth) {
    if (depth > MAX_SHADOW_DEPTH || !root) return null;
    for (const selector of selectors) {
      let nodes;
      try {
        nodes = root.querySelectorAll(selector);
      } catch (_) {
        continue;
      }
      for (const node of nodes) {
        if (node instanceof HTMLElement && isVisibleElement(node) && isPromptLikeElement(node)) return node;
      }
    }
    const all = root.querySelectorAll("*");
    for (const node of all) {
      if (node.shadowRoot) {
        const found = queryPromptInShadowTree(selectors, node.shadowRoot, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  function discoverBestPromptElement() {
    const seen = new Set();
    const candidates = [];

    function add(el) {
      if (!(el instanceof HTMLElement) || seen.has(el) || !isVisibleElement(el) || !isPromptLikeElement(el)) return;
      seen.add(el);
      candidates.push(el);
    }

    function walk(root, depth) {
      if (depth > MAX_SHADOW_DEPTH || !root) return;
      root.querySelectorAll("textarea").forEach(add);
      root.querySelectorAll("input").forEach(add);
      root.querySelectorAll('[contenteditable="true"]').forEach(add);
      root.querySelectorAll("rich-textarea, [role='textbox']").forEach(add);
      root.querySelectorAll("*").forEach((n) => {
        if (n.shadowRoot) walk(n.shadowRoot, depth + 1);
      });
    }

    if (document.body) walk(document.body, 0);
    if (candidates.length === 0) return null;

    function score(el) {
      const r = el.getBoundingClientRect();
      const area = Math.max(1, r.width * r.height);
      const midY = r.top + r.height / 2;
      const vh = window.innerHeight || 1;
      const bottomBias = 0.35 + (midY / vh) * 1.25;
      return area * bottomBias;
    }

    candidates.sort((a, b) => score(b) - score(a));
    return candidates[0];
  }

  /**
   * GitHub/GitLab/etc.: comment UI often uses <form> + submit; the focused field may not
   * be the one tied to the clicked “Comment” button. Resolve textarea/CE from the click path.
   */
  /**
   * Tighten the chosen field to the semantic container around P (form / dialog / single-field wrapper).
   */
  function refinePromptWithContainer(picked) {
    const pc = globalThis.ConfidentialAgentPromptContainer;
    if (!pc || !(picked instanceof HTMLElement)) return picked;
    const C = pc.findPromptContainer(picked, { maxAncestorSteps: 5 });
    if (!C) return picked;
    const refined = pickBestPromptIn(C);
    return refined || picked;
  }

  function pickBestPromptIn(container) {
    if (!(container instanceof HTMLElement)) return null;
    const fields = container.querySelectorAll(
      "textarea:not([disabled]), [contenteditable='true']"
    );
    let best = null;
    let bestScore = -1;
    fields.forEach((f) => {
      if (!(f instanceof HTMLElement) || !isPromptLikeElement(f) || !isVisibleElement(f)) return;
      const r = f.getBoundingClientRect();
      const score = Math.max(1, r.width * r.height);
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    });
    return best;
  }

  function getPromptFromClickEvent(event) {
    if (!event || event.type !== "click") return null;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (const node of path) {
      if (!(node instanceof Element)) continue;
      if (node.closest?.("[data-confidential-agent-modal='true']")) continue;

      const submitLike = node.closest(
        "button, input[type='submit'], input[type='button'], [role='button']"
      );
      if (!submitLike || !(submitLike instanceof HTMLElement)) continue;

      const form = submitLike.closest("form");
      if (form) {
        const picked = pickBestPromptIn(form);
        if (picked) return refinePromptWithContainer(picked);
      }

      let scope = submitLike.parentElement;
      for (let d = 0; d < 14 && scope; d++) {
        const picked = pickBestPromptIn(scope);
        if (picked) return refinePromptWithContainer(picked);
        scope = scope.parentElement;
      }
    }
    return null;
  }

  function getPromptElement(event) {
    const cfg = getActiveSiteConfig();
    if (!cfg) return null;

    if (event && event.type === "keydown") {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement && isPromptLikeElement(ae) && isVisibleElement(ae)) {
        return ae;
      }
    }

    if (event && event.type === "click") {
      const fromClick = getPromptFromClickEvent(event);
      if (fromClick) return fromClick;
    }

    if (
      lastFocusedPrompt &&
      lastFocusedPrompt.isConnected &&
      isVisibleElement(lastFocusedPrompt) &&
      isPromptLikeElement(lastFocusedPrompt) &&
      readPromptValue(lastFocusedPrompt).trim().length > 0
    ) {
      return lastFocusedPrompt;
    }

    const selectors = Array.isArray(cfg?.promptSelectors) ? cfg.promptSelectors : [];
    for (const selector of selectors) {
      try {
        const nodes = document.querySelectorAll(selector);
        for (const node of nodes) {
          if (node instanceof HTMLElement && isVisibleElement(node) && isPromptLikeElement(node)) return node;
        }
      } catch (_) {}
    }
    const inShadow = queryPromptInShadowTree(selectors, document.body, 0);
    if (inShadow) return inShadow;

    const universal = discoverBestPromptElement();
    if (universal) return universal;

    return queryPromptInShadowTree(
      ["rich-textarea", "textarea", '[contenteditable="true"]', 'input[type="text"]'],
      document.body,
      0
    );
  }

  function isActivatableSubmitControl(el) {
    if (!(el instanceof HTMLElement) || !isVisibleElement(el)) return false;
    if (el instanceof HTMLButtonElement) return !el.disabled;
    if (el instanceof HTMLInputElement && el.type === "submit") return !el.disabled;
    if (el.getAttribute("role") === "button") return true;
    if (el.tagName === "BUTTON") return !(el instanceof HTMLButtonElement) || !el.disabled;
    return false;
  }

  function discoverSendButtonDeep(cfg) {
    const patterns = Array.isArray(cfg.sendButtonPatterns) ? cfg.sendButtonPatterns : [];
    const candidates = [];

    function consider(el) {
      if (!isActivatableSubmitControl(el)) return;
      const label = (
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        (el instanceof HTMLInputElement ? el.value : "") ||
        (el.innerText || el.textContent || "")
      ).trim();
      if (label && patterns.some((p) => p.test(label))) candidates.push(el);
    }

    function walk(root, depth) {
      if (depth > MAX_SHADOW_DEPTH || !root) return;
      root.querySelectorAll("button, [role='button'], input[type='submit']").forEach(consider);
      root.querySelectorAll("*").forEach((n) => {
        if (n.shadowRoot) walk(n.shadowRoot, depth + 1);
      });
    }

    walk(document.body, 0);
    return candidates[0] || null;
  }

  function getSendButton() {
    const cfg = getActiveSiteConfig();
    if (!cfg) return null;
    const selectors = Array.isArray(cfg.sendButtonSelectors) ? cfg.sendButtonSelectors : [];
    for (const selector of selectors) {
      try {
        const nodes = document.querySelectorAll(selector);
        for (const node of nodes) {
          if (node instanceof HTMLButtonElement && !node.disabled && isVisibleElement(node)) return node;
        }
      } catch (_) {}
    }
    return discoverSendButtonDeep(cfg);
  }

  function matchesSendButton(event) {
    if (!event || !(event.target instanceof Element)) return false;
    if (event.target.closest("[data-confidential-agent-modal='true']")) return false;
    const cfg = getActiveSiteConfig();
    if (!cfg) return false;

    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    const selectors = Array.isArray(cfg.sendButtonSelectors) ? cfg.sendButtonSelectors : [];

    for (const node of path) {
      if (!(node instanceof Element)) continue;

      for (const selector of selectors) {
        let matched = null;
        try {
          if (node.matches(selector)) matched = node;
          else matched = node.closest(selector);
        } catch (_) {
          continue;
        }
        if (
          matched &&
          (matched instanceof HTMLButtonElement ||
            (matched instanceof HTMLElement &&
              (matched.getAttribute("role") === "button" ||
                (matched.tagName === "DIV" && matched.getAttribute("aria-label")))))
        ) {
          if (matched instanceof HTMLButtonElement && matched.disabled) continue;
          return true;
        }
      }

      if (node instanceof HTMLElement) {
        const text = (node.innerText || node.textContent || "").trim().slice(0, 120);
        if (
          text &&
          cfg.sendButtonPatterns.some((pattern) => pattern.test(text)) &&
          (node instanceof HTMLButtonElement ||
            node.getAttribute("role") === "button" ||
            node.tagName === "BUTTON")
        ) {
          if (node instanceof HTMLButtonElement && node.disabled) continue;
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Plain text as the user sees it in a rich / contenteditable field.
   * Prefer innerText so line breaks between blocks (<p>, <div>, etc.) match the UI;
   * textContent often concatenates blocks without newlines.
   */
  function readContentEditablePlainText(root) {
    if (!(root instanceof HTMLElement)) return "";
    try {
      if (typeof root.innerText === "string") {
        return root.innerText;
      }
    } catch (_) {}
    return root.textContent || "";
  }

  function readPromptValue(el) {
    if (!el) return "";
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return el.value || "";
    }
    try {
      const v = el.value;
      if (typeof v === "string" && v.length) return v;
    } catch (_) {}
    const sr = el.shadowRoot;
    if (sr) {
      const ta = sr.querySelector("textarea");
      if (ta instanceof HTMLTextAreaElement) return ta.value || "";
      const ce = sr.querySelector('[contenteditable="true"]');
      if (ce instanceof HTMLElement) return readContentEditablePlainText(ce);
    }
    if (el.getAttribute?.("contenteditable") === "true") {
      return readContentEditablePlainText(el);
    }
    if (el.isContentEditable) {
      return readContentEditablePlainText(el);
    }
    return el.textContent || "";
  }

  /**
   * React / Lexical composers keep canonical state in JS — assigning .value or
   * .textContent alone often does not update what gets submitted.
   */
  function setNativeFormValue(el, str) {
    if (!(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) return;
    const proto =
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) {
      desc.set.call(el, str);
    } else {
      el.value = str;
    }
    try {
      const tracker = el._valueTracker;
      if (tracker && typeof tracker.setValue === "function") {
        tracker.setValue("");
      }
    } catch (_) {}
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setContentEditableValue(el, str) {
    const want = String(str).replace(/\r\n/g, "\n");
    el.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (_) {}
    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, want);
    } catch (_) {}
    const got = (el.innerText || el.textContent || "").replace(/\r\n/g, "\n");
    if (!inserted || got !== want) {
      // innerText preserves line breaks for display; textContent alone often collapses them.
      try {
        el.innerText = want;
      } catch (_) {
        el.textContent = want;
      }
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertReplacementText",
          data: want,
        })
      );
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function writePromptValue(el, value) {
    if (!el) return;
    let str = value == null ? "" : String(value);
    str = I18n.localizeNerBracketPlaceholders(str, uiLocale);

    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      setNativeFormValue(el, str);
      return;
    }
    try {
      if (
        el instanceof HTMLElement &&
        !(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) &&
        "value" in el &&
        typeof el.value === "string"
      ) {
        el.value = str;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    } catch (_) {}
    const sr = el.shadowRoot;
    if (sr) {
      const ta = sr.querySelector("textarea");
      if (ta instanceof HTMLTextAreaElement) {
        setNativeFormValue(ta, str);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      const ce = sr.querySelector('[contenteditable="true"]');
      if (ce instanceof HTMLElement) {
        setContentEditableValue(ce, str);
        return;
      }
    }
    if (el.getAttribute?.("contenteditable") === "true") {
      setContentEditableValue(el, str);
      return;
    }
    el.textContent = str;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  function _injectCaStyles() {
    if (document.getElementById("ca-anim-styles")) return;
    const s = document.createElement("style");
    s.id = "ca-anim-styles";
    s.textContent = [
      "@keyframes ca-slide-in{from{transform:translateX(calc(100% + 32px));opacity:0}to{transform:translateX(0);opacity:1}}",
      "@keyframes ca-slide-out{from{transform:translateX(0);opacity:1}to{transform:translateX(calc(100% + 32px));opacity:0}}",
      "@keyframes ca-toast-in{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}",
      "@keyframes ca-toast-out{from{transform:translateY(0);opacity:1}to{transform:translateY(16px);opacity:0}}",
      "@keyframes ca-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}",
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }

  function showToast(message, type) {
    _injectCaStyles();
    const map = {
      info:    { bg: "#1e293b", text: "#f1f5f9", accent: "#6366f1", icon: "ℹ" },
      success: { bg: "#052e16", text: "#dcfce7", accent: "#10b981", icon: "✓" },
      warning: { bg: "#451a03", text: "#fef3c7", accent: "#f59e0b", icon: "⚠" },
      error:   { bg: "#450a0a", text: "#fee2e2", accent: "#ef4444", icon: "✕" },
    };
    const c = map[type] || map.info;
    const el = document.createElement("div");
    el.dataset.confidentialAgentToast = "true";
    Object.assign(el.style, {
      position: "fixed", bottom: "24px", right: "24px", maxWidth: "320px",
      background: c.bg, color: c.text, borderRadius: "10px",
      padding: "12px 16px", fontSize: "13px", lineHeight: "1.5",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      boxShadow: "0 4px 24px rgba(0,0,0,0.3)", zIndex: "2147483646",
      display: "flex", gap: "10px", alignItems: "flex-start",
      animation: "ca-toast-in 0.2s ease forwards",
      borderLeft: `3px solid ${c.accent}`, cursor: "default",
    });
    const icon = document.createElement("span");
    icon.style.flexShrink = "0";
    icon.style.fontWeight = "700";
    icon.textContent = c.icon;
    const text = document.createElement("span");
    text.textContent = message;
    el.append(icon, text);
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.animation = "ca-toast-out 0.2s ease forwards";
      setTimeout(() => el.remove(), 200);
    }, 4500);
  }

  function showQuickConfirm(message) {
    _injectCaStyles();
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.dataset.confidentialAgentConfirm = "true";
      Object.assign(el.style, {
        position: "fixed", bottom: "24px", right: "24px", width: "320px",
        background: "#1e293b", borderRadius: "12px", padding: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: "2147483647",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
        animation: "ca-toast-in 0.2s ease forwards",
      });
      const msg = document.createElement("p");
      Object.assign(msg.style, {
        color: "#f1f5f9", fontSize: "13px", lineHeight: "1.5", marginBottom: "14px",
      });
      msg.textContent = message;
      const row = document.createElement("div");
      Object.assign(row.style, { display: "flex", gap: "8px", justifyContent: "flex-end" });
      const noBtn = document.createElement("button");
      Object.assign(noBtn.style, {
        padding: "6px 14px", fontSize: "12px", fontWeight: "600",
        background: "transparent", border: "1.5px solid #475569",
        borderRadius: "7px", cursor: "pointer", color: "#94a3b8",
      });
      noBtn.textContent = __("cs_toast_cancel");
      const yesBtn = document.createElement("button");
      Object.assign(yesBtn.style, {
        padding: "6px 14px", fontSize: "12px", fontWeight: "600",
        background: "#6366f1", border: "1.5px solid #6366f1",
        borderRadius: "7px", cursor: "pointer", color: "#fff",
      });
      yesBtn.textContent = __("cs_toast_confirm");
      const cleanup = (val) => { el.remove(); resolve(val); };
      yesBtn.addEventListener("click", () => cleanup(true));
      noBtn.addEventListener("click", () => cleanup(false));
      row.append(noBtn, yesBtn);
      el.append(msg, row);
      document.body.appendChild(el);
    });
  }

  function showResponseWarningBanner(node, label, onDecision) {
    if (node.previousElementSibling?.dataset?.confidentialAgentBanner === "true") return;
    const banner = document.createElement("div");
    banner.dataset.confidentialAgentBanner = "true";
    Object.assign(banner.style, {
      margin: "8px 0", padding: "10px 14px",
      background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: "10px",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      fontSize: "13px", display: "flex", alignItems: "center", gap: "12px",
      lineHeight: "1.4",
    });
    const ico = document.createElement("span");
    ico.style.flexShrink = "0";
    ico.textContent = "⚠️";
    const msg = document.createElement("span");
    Object.assign(msg.style, { flex: "1", color: "#78350f" });
    msg.textContent = label;
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", gap: "6px", flexShrink: "0" });
    const keepBtn = document.createElement("button");
    Object.assign(keepBtn.style, {
      padding: "4px 10px", fontSize: "12px", fontWeight: "600",
      background: "#fff", border: "1.5px solid #fcd34d", borderRadius: "6px",
      cursor: "pointer", color: "#78350f",
    });
    keepBtn.textContent = __("cs_keep_visible");
    const hideBtn = document.createElement("button");
    Object.assign(hideBtn.style, {
      padding: "4px 10px", fontSize: "12px", fontWeight: "600",
      background: "#f59e0b", border: "1.5px solid #f59e0b", borderRadius: "6px",
      cursor: "pointer", color: "#fff",
    });
    hideBtn.textContent = __("cs_hide");
    keepBtn.addEventListener("click", () => { banner.remove(); onDecision(true); });
    hideBtn.addEventListener("click", () => { banner.remove(); onDecision(false); });
    row.append(keepBtn, hideBtn);
    banner.append(ico, msg, row);
    node.parentElement?.insertBefore(banner, node);
  }

  function showUserAlert(message) {
    showToast(message, "info");
  }

  // ── Auto-anonymize helpers ──────────────────────────────────────────────────

  /**
   * Applies the precise server-side redactions returned by the API.
   * Falls back to local regex redaction if no server redactions are provided.
   */
  function applyServerRedactions(text, redactions) {
    if (!Array.isArray(redactions) || redactions.length === 0) {
      return redactorApi.applyLocalRedaction(text).text || text;
    }
    let result = text;
    for (const { original, replacement } of redactions) {
      if (original && replacement) {
        result = result.split(original).join(replacement);
      }
    }
    return result;
  }

  async function getAutoAnonymizeSetting() {
    try {
      const data = await chrome.storage.sync.get(["autoAnonymize"]);
      return data.autoAnonymize === true;
    } catch {
      return false;
    }
  }

  function markExtensionContextInvalid(reason) {
    if (extensionContextInvalid) return;
    extensionContextInvalid = true;
    if (responseScanTimer) {
      clearTimeout(responseScanTimer);
      responseScanTimer = null;
    }
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    console.info("Confidential Agent extension context invalidated:", reason);
  }

  function isContextInvalidError(errorText) {
    return String(errorText || "").toLowerCase().includes("context invalidated");
  }

  function notifyExtensionReloadRequired() {
    if (extensionReloadNoticeShown) return;
    extensionReloadNoticeShown = true;
    showToast(__("cs_ext_refresh"), "warning");
  }

  /**
   * If the flag says no modal is open but panels are still in the DOM (e.g. interrupted
   * animation), remove them so an older review does not reappear under a newer one.
   */
  function removeStaleConfidentialModalsIfAny() {
    if (promptModalOpen) return;
    try {
      document.querySelectorAll('[data-confidential-agent-modal="true"]').forEach((node) => node.remove());
    } catch (_) {}
  }

  async function safeSendMessage(message) {
    try {
      if (!chrome?.runtime?.id) {
        throw new Error("Extension context invalidated");
      }
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error || "");
      if (isContextInvalidError(messageText)) {
        markExtensionContextInvalid(messageText);
      }
      return {
        ok: false,
        error: messageText || __("cs_unknown_msg_err"),
      };
    }
  }

  function showPromptReviewModal({ action, reasons, detections = [], riskScore = 0, originalPrompt, suggestedPrompt }) {
    removeStaleConfidentialModalsIfAny();
    if (promptModalOpen) {
      return Promise.resolve({ status: "cancel", prompt: originalPrompt });
    }
    promptModalOpen = true;
    _injectCaStyles();

    return new Promise((resolve) => {
      try {
        const isBlock = action === "BLOCK";
        const isWarn  = action === "WARN";

        const accent   = isBlock ? "#ef4444" : isWarn ? "#f59e0b" : "#3b82f6";
        const headerBg = isBlock ? "#fef2f2" : isWarn ? "#fffbeb" : "#eff6ff";
        const pillBg   = isBlock ? "#fee2e2" : isWarn ? "#fef3c7" : "#dbeafe";
        const pillText = isBlock ? "#991b1b" : isWarn ? "#92400e" : "#1e40af";
        const titleText = isBlock ? __("cs_title_block") : isWarn ? __("cs_title_warn") : __("cs_title_anon");
        const headerEmoji = isBlock ? "🛡" : isWarn ? "⚠" : "🔵";

        // ── Panel container ──────────────────────────────────────────────────
        const panel = document.createElement("div");
        panel.dataset.confidentialAgentModal = "true";
        Object.assign(panel.style, {
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "min(400px, calc(100vw - 48px))",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.08)",
          border: `2px solid ${accent}`,
          zIndex: "2147483647",
          fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
          animation: "ca-slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
          overflow: "hidden",
        });

        // ── Header ───────────────────────────────────────────────────────────
        const header = document.createElement("div");
        Object.assign(header.style, {
          background: headerBg, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: "10px",
          borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: "0",
        });

        const hIcon = document.createElement("div");
        Object.assign(hIcon.style, {
          width: "34px", height: "34px", background: accent,
          borderRadius: "9px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "17px", flexShrink: "0",
        });
        hIcon.textContent = headerEmoji;

        const hMeta = document.createElement("div");
        hMeta.style.flex = "1";

        const hTitle = document.createElement("div");
        Object.assign(hTitle.style, { fontWeight: "700", fontSize: "14px", color: "#0f172a" });
        hTitle.textContent = titleText;

        const hSub = document.createElement("div");
        Object.assign(hSub.style, { fontSize: "11px", color: "#64748b", marginTop: "1px" });
        hSub.textContent = __("cs_brand_subtitle");

        hMeta.append(hTitle, hSub);

        const closeBtn = document.createElement("button");
        Object.assign(closeBtn.style, {
          background: "none", border: "none", cursor: "pointer",
          color: "#94a3b8", fontSize: "20px", lineHeight: "1",
          padding: "2px 4px", borderRadius: "4px", display: "flex", alignItems: "center",
        });
        closeBtn.textContent = "×";
        closeBtn.setAttribute("aria-label", __("cs_close_aria"));

        header.append(hIcon, hMeta, closeBtn);

        // ── Body ─────────────────────────────────────────────────────────────
        const body = document.createElement("div");
        body.style.padding = "16px";

        // Detection pills
        if (detections && detections.length > 0) {
          const pillsRow = document.createElement("div");
          Object.assign(pillsRow.style, {
            display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px",
          });
          const seen = new Set();
          for (const d of detections) {
            if (seen.has(d.type)) continue;
            seen.add(d.type);
            const pill = document.createElement("span");
            Object.assign(pill.style, {
              display: "inline-flex", alignItems: "center", padding: "3px 9px",
              borderRadius: "999px", background: pillBg, color: pillText,
              fontSize: "11px", fontWeight: "600", letterSpacing: "0.02em",
            });
            pill.textContent = I18n.detectionLabel(d.type, uiLocale);
            pillsRow.appendChild(pill);
          }
          body.appendChild(pillsRow);
        }

        // Risk score bar
        if (riskScore > 0) {
          const barWrap = document.createElement("div");
          barWrap.style.marginBottom = "14px";
          const barHead = document.createElement("div");
          Object.assign(barHead.style, {
            display: "flex", justifyContent: "space-between",
            fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "5px",
          });
          const barLbl = Object.assign(document.createElement("span"), { textContent: __("cs_risk_score") });
          const barVal = Object.assign(document.createElement("span"), { textContent: `${riskScore}%` });
          barVal.style.color = accent;
          barHead.append(barLbl, barVal);
          const track = document.createElement("div");
          Object.assign(track.style, {
            height: "5px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden",
          });
          const fill = document.createElement("div");
          Object.assign(fill.style, {
            height: "100%", width: `${Math.min(riskScore, 100)}%`,
            background: accent, borderRadius: "999px",
          });
          track.appendChild(fill);
          barWrap.append(barHead, track);
          body.appendChild(barWrap);
        }

        // Description
        const desc = document.createElement("p");
        Object.assign(desc.style, {
          fontSize: "12px", color: "#64748b", marginBottom: "16px", lineHeight: "1.5",
        });
        desc.textContent = isBlock
          ? __("cs_desc_block")
          : isWarn
          ? __("cs_desc_warn")
          : __("cs_desc_anon");
        body.appendChild(desc);

        appendAwarenessSection(body, detections, () => panel.querySelector("[data-ca-prompt-actions]"));

        // Expandable editor
        const editWrap = document.createElement("div");
        editWrap.style.display = "none";
        editWrap.style.marginBottom = "14px";

        const editLbl = document.createElement("label");
        Object.assign(editLbl.style, {
          display: "block", fontSize: "10px", fontWeight: "700",
          color: "#64748b", marginBottom: "6px",
          textTransform: "uppercase", letterSpacing: "0.06em",
        });
        editLbl.textContent = suggestedPrompt !== originalPrompt
          ? __("cs_edit_label_anon")
          : __("cs_edit_label_manual");

        const ta = document.createElement("textarea");
        // Pre-load with the anonymized version so the user only needs to
        // confirm or make minor adjustments — not re-do the entire redaction.
        ta.value = I18n.localizeNerBracketPlaceholders(suggestedPrompt || originalPrompt, uiLocale);
        Object.assign(ta.style, {
          width: "100%", minHeight: "110px", maxHeight: "220px",
          fontFamily: "ui-monospace,SFMono-Regular,'Cascadia Code',monospace",
          fontSize: "12px", border: "1.5px solid #e2e8f0", borderRadius: "8px",
          padding: "10px", boxSizing: "border-box", resize: "vertical",
          color: "#1e293b", background: "#f8fafc", lineHeight: "1.5", outline: "none",
        });
        ta.addEventListener("focus", () => {
          ta.style.borderColor = "#6366f1";
          ta.style.background = "#fff";
        });
        ta.addEventListener("blur", () => {
          ta.style.borderColor = "#e2e8f0";
          ta.style.background = "#f8fafc";
        });

        editWrap.append(editLbl, ta);
        body.appendChild(editWrap);

        // ── Action buttons ────────────────────────────────────────────────────
        const actRow = document.createElement("div");
        actRow.setAttribute("data-ca-prompt-actions", "true");
        Object.assign(actRow.style, { display: "flex", gap: "8px", flexWrap: "wrap" });

        function mkBtn(label, variant) {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = label;
          Object.assign(b.style, {
            padding: "8px 14px", borderRadius: "8px",
            fontSize: "12px", fontWeight: "600", cursor: "pointer",
            transition: "opacity 0.15s", border: "1.5px solid",
            outline: "none", fontFamily: "inherit", lineHeight: "1",
          });
          if (variant === "primary") {
            Object.assign(b.style, { background: accent, borderColor: accent, color: "#fff" });
            b.addEventListener("mouseenter", () => { b.style.opacity = "0.85"; });
            b.addEventListener("mouseleave", () => { b.style.opacity = "1"; });
          } else if (variant === "secondary") {
            Object.assign(b.style, {
              background: pillBg, borderColor: `${accent}66`, color: pillText,
            });
          } else {
            Object.assign(b.style, {
              background: "#fff", borderColor: "#e2e8f0", color: "#64748b",
            });
            b.addEventListener("mouseenter", () => { b.style.background = "#f8fafc"; });
            b.addEventListener("mouseleave", () => { b.style.background = "#fff"; });
          }
          return b;
        }

        const autoBtn     = !isBlock ? mkBtn(__("cs_btn_auto_send"), "primary") : null;
        const editBtn     = mkBtn(__("cs_btn_edit"), "secondary");
        const sendEditBtn = mkBtn(__("cs_btn_send_edited"), "primary");
        sendEditBtn.style.display = "none";
        const cancelBtn   = mkBtn(__("cs_btn_cancel"), "ghost");

        let editOpen = false;
        function toggleEdit() {
          editOpen = !editOpen;
          editWrap.style.display    = editOpen ? "block" : "none";
          sendEditBtn.style.display = editOpen ? "" : "none";
          editBtn.textContent       = editOpen ? __("cs_btn_hide_editor") : __("cs_btn_edit");
          if (autoBtn) autoBtn.style.display = editOpen ? "none" : "";
          if (editOpen) setTimeout(() => ta.focus(), 40);
        }

        function cleanupAndResolve(value) {
          panel.style.animation = "ca-slide-out 0.18s ease forwards";
          setTimeout(() => {
            promptModalOpen = false;
            panel.remove();
            resolve(value);
          }, 180);
        }

        editBtn.addEventListener("click", toggleEdit);
        sendEditBtn.addEventListener("click", () => cleanupAndResolve({ status: "manual", prompt: ta.value }));
        if (autoBtn) autoBtn.addEventListener("click", () => cleanupAndResolve({ status: "auto", prompt: suggestedPrompt }));
        cancelBtn.addEventListener("click", () => cleanupAndResolve({ status: "cancel", prompt: originalPrompt }));
        closeBtn.addEventListener("click", () => cleanupAndResolve({ status: "cancel", prompt: originalPrompt }));

        function onEsc(e) {
          if (e.key === "Escape") {
            document.removeEventListener("keydown", onEsc);
            cleanupAndResolve({ status: "cancel", prompt: originalPrompt });
          }
        }
        document.addEventListener("keydown", onEsc);

        if (isBlock) {
          actRow.append(editBtn, sendEditBtn, cancelBtn);
        } else {
          actRow.append(autoBtn, editBtn, sendEditBtn, cancelBtn);
        }

        body.appendChild(actRow);
        panel.append(header, body);
        document.querySelectorAll('[data-confidential-agent-modal="true"]').forEach((n) => n.remove());
        document.body.appendChild(panel);

        // For BLOCK: open the editor immediately so the anonymized text is
        // visible right away — the user just reviews and clicks "Send edited".
        if (isBlock) {
          toggleEdit();
          setTimeout(() => { panel.style.animation = "ca-shake 0.4s ease"; }, 260);
        }
      } catch (error) {
        promptModalOpen = false;
        resolve({
          status: "fallback",
          prompt: originalPrompt,
          error: error instanceof Error ? error.message : __("cs_modal_err"),
        });
      }
    });
  }

  /**
   * Show a rephrase-suggestion modal when action === "SUGGEST_REPHRASE".
   *
   * Presents 3 AI-generated alternatives that preserve the user's intent while
   * removing offensive or aggressive language.  The user can:
   *   - Click "Use this" on any card → that phrasing is adopted and sent.
   *   - Click "Edit manually" → the first suggestion loads in an editor.
   *   - Click "Send original" → the original text is submitted unchanged.
   *   - Click "Cancel" / press Esc → submission is aborted.
   *
   * Returns a Promise<{ status, prompt }> consistent with showPromptReviewModal.
   */
  function showRephraseModal({ suggestions = [], originalPrompt, detections = [], riskScore = 0 }) {
    removeStaleConfidentialModalsIfAny();
    if (promptModalOpen) {
      return Promise.resolve({ status: "cancel", prompt: originalPrompt });
    }
    promptModalOpen = true;
    _injectCaStyles();

    return new Promise((resolve) => {
      try {
        const accent = "#7c3aed"; // violet — distinct from red/amber security modals
        const headerBg = "#f5f3ff";
        const pillBg = "#ede9fe";
        const pillText = "#5b21b6";

        const panel = document.createElement("div");
        panel.dataset.confidentialAgentModal = "true";
        Object.assign(panel.style, {
          position: "fixed", bottom: "24px", right: "24px",
          width: "min(440px, calc(100vw - 48px))", maxHeight: "90vh",
          overflowY: "auto", background: "#ffffff", borderRadius: "16px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.08)",
          border: `2px solid ${accent}`, zIndex: "2147483647",
          fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
          animation: "ca-slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
          overflow: "hidden",
        });

        // ── Header ───────────────────────────────────────────────────────────
        const header = document.createElement("div");
        Object.assign(header.style, {
          background: headerBg, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: "10px",
          borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: "0",
        });
        const hIcon = document.createElement("div");
        Object.assign(hIcon.style, {
          width: "34px", height: "34px", background: accent,
          borderRadius: "9px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "17px", flexShrink: "0",
        });
        hIcon.textContent = "✍️";
        const hMeta = document.createElement("div");
        hMeta.style.flex = "1";
        const hTitle = document.createElement("div");
        Object.assign(hTitle.style, { fontWeight: "700", fontSize: "14px", color: "#0f172a" });
        hTitle.textContent = __("cs_rephrase_title");
        const hSub = document.createElement("div");
        Object.assign(hSub.style, { fontSize: "11px", color: "#64748b", marginTop: "1px" });
        hSub.textContent = __("cs_rephrase_sub");
        hMeta.append(hTitle, hSub);
        const closeBtn = document.createElement("button");
        Object.assign(closeBtn.style, {
          background: "none", border: "none", cursor: "pointer",
          color: "#94a3b8", fontSize: "20px", lineHeight: "1",
          padding: "2px 4px", borderRadius: "4px",
        });
        closeBtn.type = "button";
        closeBtn.textContent = "×";
        header.append(hIcon, hMeta, closeBtn);

        // ── Body ─────────────────────────────────────────────────────────────
        const body = document.createElement("div");
        body.style.padding = "16px";

        // Detection pills (toxic categories)
        if (detections && detections.length > 0) {
          const pillsRow = document.createElement("div");
          Object.assign(pillsRow.style, { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" });
          const seen = new Set();
          for (const d of detections) {
            if (seen.has(d.type)) continue;
            seen.add(d.type);
            const pill = document.createElement("span");
            Object.assign(pill.style, {
              display: "inline-flex", alignItems: "center", padding: "3px 9px",
              borderRadius: "999px", background: pillBg, color: pillText,
              fontSize: "11px", fontWeight: "600",
            });
            pill.textContent = I18n.rephraseLabel(d.type, uiLocale);
            pillsRow.appendChild(pill);
          }
          body.appendChild(pillsRow);
        }

        // Description
        const desc = document.createElement("p");
        Object.assign(desc.style, { fontSize: "12px", color: "#64748b", marginBottom: "14px", lineHeight: "1.6" });
        desc.textContent = suggestions.length > 0
          ? __("cs_rephrase_desc_suggestions")
          : __("cs_rephrase_desc_none");
        body.appendChild(desc);

        appendAwarenessSection(body, detections, () =>
          body.querySelector("[data-ca-suggestion-anchor]") || body.querySelector("[data-ca-rephrase-actions]")
        );

        // ── Suggestion cards ─────────────────────────────────────────────────
        const labels = [__("cs_option_1"), __("cs_option_2"), __("cs_option_3")];
        if (suggestions.length > 0) {
          const cardsLabel = document.createElement("div");
          Object.assign(cardsLabel.style, {
            fontSize: "10px", fontWeight: "700", color: "#7c3aed",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px",
          });
          cardsLabel.textContent = __("cs_suggested_alt");
          body.appendChild(cardsLabel);

          suggestions.forEach((suggestion, idx) => {
            const card = document.createElement("div");
            Object.assign(card.style, {
              background: "#f8f7ff", border: "1.5px solid #ddd6fe",
              borderRadius: "10px", padding: "10px 12px",
              marginBottom: "8px", cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
            });
            card.addEventListener("mouseenter", () => {
              card.style.borderColor = accent;
              card.style.background = "#f0eeff";
            });
            card.addEventListener("mouseleave", () => {
              card.style.borderColor = "#ddd6fe";
              card.style.background = "#f8f7ff";
            });

            const cardHeader = document.createElement("div");
            Object.assign(cardHeader.style, {
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: "6px",
            });
            const cardLabel = document.createElement("span");
            Object.assign(cardLabel.style, {
              fontSize: "10px", fontWeight: "700", color: "#7c3aed",
              textTransform: "uppercase", letterSpacing: "0.05em",
            });
            cardLabel.textContent = labels[idx] || __("cs_option_n", { n: idx + 1 });
            const useBtn = document.createElement("button");
            useBtn.type = "button";
            useBtn.textContent = __("cs_use_this");
            Object.assign(useBtn.style, {
              background: accent, color: "#fff", border: "none",
              borderRadius: "6px", padding: "4px 10px",
              fontSize: "11px", fontWeight: "700", cursor: "pointer",
              transition: "opacity 0.15s",
            });
            useBtn.addEventListener("mouseenter", () => { useBtn.style.opacity = "0.82"; });
            useBtn.addEventListener("mouseleave", () => { useBtn.style.opacity = "1"; });
            useBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              cleanupAndResolve({ status: "auto", prompt: suggestion });
            });

            const cardText = document.createElement("div");
            Object.assign(cardText.style, {
              fontSize: "13px", color: "#1e293b", lineHeight: "1.55",
            });
            cardText.textContent = suggestion;

            cardHeader.append(cardLabel, useBtn);
            card.append(cardHeader, cardText);
            card.addEventListener("click", () => cleanupAndResolve({ status: "auto", prompt: suggestion }));
            if (idx === 0) {
              card.setAttribute("data-ca-suggestion-anchor", "true");
            }
            body.appendChild(card);
          });
        }

        // ── Manual editor (collapsed by default) ─────────────────────────────
        const editWrap = document.createElement("div");
        editWrap.style.display = "none";
        editWrap.style.marginTop = "10px";
        const editLbl = document.createElement("label");
        Object.assign(editLbl.style, {
          display: "block", fontSize: "10px", fontWeight: "700",
          color: "#64748b", marginBottom: "6px",
          textTransform: "uppercase", letterSpacing: "0.06em",
        });
        editLbl.textContent = __("cs_edit_tone");
        const ta = document.createElement("textarea");
        ta.value = suggestions[0] || originalPrompt;
        Object.assign(ta.style, {
          width: "100%", minHeight: "90px", maxHeight: "180px",
          fontFamily: "ui-monospace,SFMono-Regular,monospace",
          fontSize: "12px", border: "1.5px solid #e2e8f0", borderRadius: "8px",
          padding: "10px", boxSizing: "border-box", resize: "vertical",
          color: "#1e293b", background: "#f8fafc", lineHeight: "1.5", outline: "none",
        });
        ta.addEventListener("focus", () => { ta.style.borderColor = accent; ta.style.background = "#fff"; });
        ta.addEventListener("blur", () => { ta.style.borderColor = "#e2e8f0"; ta.style.background = "#f8fafc"; });
        editWrap.append(editLbl, ta);
        body.appendChild(editWrap);

        // ── Action buttons ────────────────────────────────────────────────────
        const actRow = document.createElement("div");
        actRow.setAttribute("data-ca-rephrase-actions", "true");
        Object.assign(actRow.style, { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" });

        function mkBtn2(label, variant) {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = label;
          Object.assign(b.style, {
            padding: "8px 14px", borderRadius: "8px",
            fontSize: "12px", fontWeight: "600", cursor: "pointer",
            transition: "opacity 0.15s", border: "1.5px solid",
            outline: "none", fontFamily: "inherit", lineHeight: "1",
          });
          if (variant === "primary") {
            Object.assign(b.style, { background: accent, borderColor: accent, color: "#fff" });
            b.addEventListener("mouseenter", () => { b.style.opacity = "0.82"; });
            b.addEventListener("mouseleave", () => { b.style.opacity = "1"; });
          } else if (variant === "ghost-danger") {
            Object.assign(b.style, { background: "#fff5f5", borderColor: "#fca5a5", color: "#ef4444" });
          } else {
            Object.assign(b.style, { background: "#fff", borderColor: "#e2e8f0", color: "#64748b" });
            b.addEventListener("mouseenter", () => { b.style.background = "#f8fafc"; });
            b.addEventListener("mouseleave", () => { b.style.background = "#fff"; });
          }
          return b;
        }

        let editOpen = false;
        function toggleEdit2() {
          editOpen = !editOpen;
          editWrap.style.display = editOpen ? "block" : "none";
          editManualBtn.textContent = editOpen ? __("cs_btn_hide_editor") : __("cs_edit_manually");
          sendEditedBtn.style.display = editOpen ? "" : "none";
          if (editOpen) setTimeout(() => ta.focus(), 40);
        }

        function cleanupAndResolve(value) {
          panel.style.animation = "ca-slide-out 0.18s ease forwards";
          setTimeout(() => { promptModalOpen = false; panel.remove(); resolve(value); }, 180);
        }

        const editManualBtn = mkBtn2(__("cs_edit_manually"), "ghost");
        const sendEditedBtn = mkBtn2(__("cs_send_edited"), "primary");
        sendEditedBtn.style.display = "none";
        const sendOriginalBtn = mkBtn2(__("cs_send_original"), "ghost-danger");
        const cancelBtn = mkBtn2(__("cs_btn_cancel"), "ghost");

        editManualBtn.addEventListener("click", toggleEdit2);
        sendEditedBtn.addEventListener("click", () => cleanupAndResolve({ status: "manual", prompt: ta.value }));
        sendOriginalBtn.addEventListener("click", () => cleanupAndResolve({ status: "original", prompt: originalPrompt }));
        cancelBtn.addEventListener("click", () => cleanupAndResolve({ status: "cancel", prompt: originalPrompt }));
        closeBtn.addEventListener("click", () => cleanupAndResolve({ status: "cancel", prompt: originalPrompt }));

        function onEsc(e) {
          if (e.key === "Escape") {
            document.removeEventListener("keydown", onEsc);
            cleanupAndResolve({ status: "cancel", prompt: originalPrompt });
          }
        }
        document.addEventListener("keydown", onEsc);

        actRow.append(editManualBtn, sendEditedBtn, sendOriginalBtn, cancelBtn);
        body.appendChild(actRow);
        panel.append(header, body);
        document.querySelectorAll('[data-confidential-agent-modal="true"]').forEach((n) => n.remove());
        document.body.appendChild(panel);

      } catch (error) {
        promptModalOpen = false;
        resolve({ status: "fallback", prompt: originalPrompt, error: error instanceof Error ? error.message : __("cs_rephrase_err") });
      }
    });
  }

  function normalizeText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hashString(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return String(hash >>> 0);
  }

  function hasRedactedPlaceholders(text) {
    return /\[REDACTED_[A-Z_]+\]/.test(String(text || ""));
  }

  function getResponseCandidates() {
    const cfg = getActiveSiteConfig();
    if (!cfg) return [];
    const selectors = Array.isArray(cfg.responseSelectors) ? cfg.responseSelectors : [];
    const collected = [];
    const seen = new Set();

    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector);
      nodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (seen.has(node)) return;
        if (node.closest("form")) return;
        seen.add(node);
        collected.push(node);
      });
    }

    // Generic fallback for unknown DOM structures.
    if (collected.length === 0) {
      document.querySelectorAll("main article, [role='article'], .markdown, .prose").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.closest("form")) return;
        if (seen.has(node)) return;
        seen.add(node);
        collected.push(node);
      });
    }

    return collected;
  }

  function markReviewed(node, hash) {
    node.dataset.confidentialAgentReviewed = hash;
  }

  function isAlreadyReviewed(node, hash) {
    return node.dataset.confidentialAgentReviewed === hash;
  }

  // ── Response redaction helpers ────────────────────────────────────────────

  /**
   * Create a styled <span> for a single redacted fragment.
   * - BLOCK  : original text stays in the DOM but is blurred (can't be read).
   * - WARN / ANONYMIZE : text is replaced with a coloured [REDACTED_TYPE] pill.
   */
  function createRedactionSpan(original, replacement, action) {
    const span = document.createElement("span");
    span.dataset.confidentialAgentRedacted = "true";
    if (action === "BLOCK") {
      span.textContent = original;
      Object.assign(span.style, {
        filter: "blur(5px)",
        userSelect: "none",
        pointerEvents: "none",
        display: "inline",
        background: "rgba(239,68,68,0.10)",
        borderRadius: "3px",
        padding: "0 1px",
      });
      span.title = "Sensitive content blocked by Confidential Agent";
    } else {
      span.textContent = replacement;
      Object.assign(span.style, {
        background: "#fef3c7",
        color: "#92400e",
        fontFamily: "ui-monospace,SFMono-Regular,monospace",
        fontSize: "0.82em",
        fontWeight: "600",
        borderRadius: "4px",
        padding: "1px 5px",
        border: "1px solid #fcd34d",
        cursor: "default",
        display: "inline",
        whiteSpace: "nowrap",
      });
      const base = original.slice(0, 30);
      span.title = `Redacted: "${base}${original.length > 30 ? "…" : ""}"`;
    }
    return span;
  }

  /**
   * Surgically redact specific text fragments inside a response DOM node.
   * Traverses only TEXT nodes — preserves markdown-rendered HTML (bold, code,
   * headers, lists) completely intact.
   *
   * Returns true if at least one fragment was found and replaced.
   * Returns false when no match was found (caller should use fallback).
   */
  function redactResponseNodeSurgically(node, redactions, action) {
    if (!(node instanceof HTMLElement)) return false;
    const valid = (Array.isArray(redactions) ? redactions : []).filter(
      (r) => r && typeof r.original === "string" && r.original.length > 0
    );
    if (valid.length === 0) return false;

    // Build a single regex with a capturing group so String.split() keeps matches.
    const escaped = valid.map((r) => r.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`(${escaped.join("|")})`, "g");
    const replacementMap = new Map(valid.map((r) => [r.original, r.replacement || "[REDACTED]"]));

    // Collect text nodes (skip script/style and already-redacted spans).
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName?.toLowerCase();
        if (["script", "style", "noscript"].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (p.dataset?.confidentialAgentRedacted === "true") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const hits = [];
    let n;
    while ((n = walker.nextNode())) {
      pattern.lastIndex = 0;
      if (pattern.test(n.textContent)) hits.push(n);
    }
    if (hits.length === 0) return false;

    for (const textNode of hits) {
      pattern.lastIndex = 0;
      const parts = textNode.textContent.split(pattern);
      if (parts.length <= 1) continue;

      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (!part) continue;
        if (replacementMap.has(part)) {
          frag.appendChild(createRedactionSpan(part, replacementMap.get(part), action));
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      }
      textNode.parentNode?.replaceChild(frag, textNode);
    }
    return true;
  }

  /**
   * Insert a non-intrusive notice strip above a response node.
   * Used for BLOCK when surgical redaction succeeded (to tell the user why
   * some words are blurred) and as a fallback when no precise values exist.
   */
  function insertResponseNotice(node, { icon, message, color, bgColor, borderColor }) {
    if (node.previousElementSibling?.dataset?.confidentialAgentNotice === "true") return;
    const notice = document.createElement("div");
    notice.dataset.confidentialAgentNotice = "true";
    Object.assign(notice.style, {
      margin: "0 0 8px 0", padding: "9px 14px",
      background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: "10px",
      display: "flex", alignItems: "center", gap: "10px",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      fontSize: "13px", color, lineHeight: "1.4",
    });
    const ico = Object.assign(document.createElement("span"), { textContent: icon });
    ico.style.flexShrink = "0";
    const txt = Object.assign(document.createElement("span"), { textContent: message });
    notice.append(ico, txt);
    node.parentElement?.insertBefore(notice, node);
  }

  /**
   * Last-resort full-node mask for cases where no specific fragments could be
   * identified (purely semantic LLM detection) and action is BLOCK.
   * Kept as a fallback — surgical redaction is always preferred.
   */
  function maskResponseNode(node, label) {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.confidentialAgentMasked === "true") return;
    node.dataset.confidentialAgentMasked = "true";
    node.style.filter = "blur(8px)";
    node.style.pointerEvents = "none";
    node.style.userSelect = "none";
    node.style.opacity = "0.4";
    node.style.transition = "all 0.3s ease";
    insertResponseNotice(node, {
      icon: "🛡",
      message: label,
      color: "#7f1d1d",
      bgColor: "#fef2f2",
      borderColor: "#fca5a5",
    });
  }

  /**
   * Local-regex fallback: used when the server returns no redaction list.
   * Uses text-node traversal to preserve rendered HTML formatting.
   */
  function redactResponseNode(node) {
    if (!(node instanceof HTMLElement)) return;
    const sourceText = normalizeText(node.innerText || node.textContent || "");
    if (!sourceText) return;
    const { applied } = redactorApi.applyLocalRedaction(sourceText);
    if (applied.length > 0) {
      redactResponseNodeSurgically(node, applied, "ANONYMIZE");
    }
  }

  // ── Image moderation ────────────────────────────────────────────────────────

  /**
   * Convert an image File to a base64 string after resizing to ≤ maxPx on
   * the longest side.  Smaller images keep their original size.
   * Always outputs JPEG to normalize the mime type and reduce payload size.
   */
  function resizeAndEncodeImage(file, maxPx = 1024) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          const ratio = Math.min(maxPx / width, maxPx / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not load image for moderation."));
      };
      img.src = objectUrl;
    });
  }

  /**
   * Clear a file input safely across browsers.
   * Setting .value = "" works for inputs without the `multiple` attribute;
   * DataTransfer is the standard way to clear the files list.
   */
  function clearFileInput(input) {
    try {
      input.files = new DataTransfer().files;
    } catch {
      // Fallback for browsers that don't support DataTransfer assignment.
      input.value = "";
    }
  }

  /**
   * Show a professional image moderation result modal.
   *
   * BLOCK → modal with blurred preview, flagged categories, no override.
   * WARN  → same modal but with "Send anyway" escape hatch.
   *
   * Returns a Promise<boolean>:
   *   - true  = user chose to proceed (WARN only)
   *   - false = user cancelled or action is BLOCK
   */
  function showImageModerationModal(decision, fileName, previewObjectUrl) {
    return new Promise((resolve) => {
      const isBlock = decision.action === "BLOCK";

      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed", inset: "0", zIndex: "2147483647",
        background: "rgba(15,23,42,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
        animation: "ca-fade-in 0.18s ease",
      });

      const card = document.createElement("div");
      Object.assign(card.style, {
        background: "#fff", borderRadius: "16px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        width: "min(440px, calc(100vw - 32px))",
        overflow: "hidden",
        animation: "ca-slide-in 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
      });

      // ── Header ─────────────────────────────────────────────────────────────
      const headerBg = isBlock ? "#fef2f2" : "#fffbeb";
      const headerBorder = isBlock ? "#fca5a5" : "#fde68a";
      const header = document.createElement("div");
      Object.assign(header.style, {
        padding: "16px 20px 14px",
        background: headerBg,
        borderBottom: `1.5px solid ${headerBorder}`,
        display: "flex", alignItems: "center", gap: "12px",
      });
      const logoWrap = document.createElement("div");
      Object.assign(logoWrap.style, {
        width: "36px", height: "36px", borderRadius: "10px",
        background: isBlock ? "#ef4444" : "#f59e0b",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: "0",
      });
      logoWrap.textContent = "🛡";
      logoWrap.style.fontSize = "18px";
      const titleWrap = document.createElement("div");
      const titleEl = Object.assign(document.createElement("div"), {
        textContent: isBlock ? __("cs_img_block_title") : __("cs_img_warn_title"),
      });
      Object.assign(titleEl.style, {
        fontWeight: "700", fontSize: "15px",
        color: isBlock ? "#991b1b" : "#92400e",
      });
      const subtitleEl = Object.assign(document.createElement("div"), {
        textContent: __("cs_brand_subtitle"),
      });
      Object.assign(subtitleEl.style, {
        fontSize: "11px", color: "#94a3b8", marginTop: "1px",
      });
      titleWrap.append(titleEl, subtitleEl);
      header.append(logoWrap, titleWrap);

      // ── Body ───────────────────────────────────────────────────────────────
      const body = document.createElement("div");
      body.style.padding = "18px 20px 20px";

      // Image preview (blurred) + filename
      if (previewObjectUrl) {
        const previewRow = document.createElement("div");
        Object.assign(previewRow.style, {
          display: "flex", alignItems: "center", gap: "14px",
          marginBottom: "14px",
        });
        const imgEl = document.createElement("img");
        imgEl.src = previewObjectUrl;
        Object.assign(imgEl.style, {
          width: "72px", height: "72px", borderRadius: "10px",
          objectFit: "cover", flexShrink: "0",
          filter: "blur(8px)",
          border: "1.5px solid #e2e8f0",
        });
        const fileInfo = document.createElement("div");
        const fileNameEl = Object.assign(document.createElement("div"), {
          textContent: fileName || __("cs_img_filename"),
        });
        Object.assign(fileNameEl.style, {
          fontWeight: "600", fontSize: "13px", color: "#1e293b",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          maxWidth: "220px",
        });
        const statusEl = Object.assign(document.createElement("div"), {
          textContent: isBlock
            ? __("cs_img_status_block")
            : __("cs_img_status_warn"),
        });
        Object.assign(statusEl.style, {
          fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4",
        });
        fileInfo.append(fileNameEl, statusEl);
        previewRow.append(imgEl, fileInfo);
        body.appendChild(previewRow);
      }

      // Detection pills
      const pillsLabel = Object.assign(document.createElement("div"), {
        textContent: __("cs_detected_content"),
      });
      Object.assign(pillsLabel.style, {
        fontSize: "10px", fontWeight: "700", color: "#64748b",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px",
      });
      body.appendChild(pillsLabel);

      const pillsWrap = document.createElement("div");
      Object.assign(pillsWrap.style, {
        display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px",
      });
      const categoryIcons = {
        IMAGE_SEXUAL: "🔞",
        IMAGE_SEXUAL_MINORS: "🚫",
        IMAGE_PARTIAL_NUDITY: "👙",
        IMAGE_VIOLENCE: "⚠️",
        IMAGE_VIOLENCE_GRAPHIC: "🩸",
        IMAGE_SELF_HARM: "🆘",
        IMAGE_SELF_HARM_INTENT: "🆘",
        IMAGE_SELF_HARM_INSTRUCTIONS: "🆘",
        IMAGE_HATE: "⛔",
        IMAGE_HATE_THREATENING: "⛔",
        IMAGE_HARASSMENT: "🚨",
        IMAGE_HARASSMENT_THREATENING: "🚨",
        IMAGE_ILLICIT: "💊",
        IMAGE_ILLICIT_VIOLENT: "💣",
      };
      for (const d of (decision.detections || [])) {
        const pill = document.createElement("div");
        const icon = categoryIcons[d.type] || "⚠️";
        const pct = Math.round((d.confidence || 0) * 100);
        pill.textContent = `${icon} ${d.valuePreview} ${pct}%`;
        Object.assign(pill.style, {
          background: isBlock ? "#fef2f2" : "#fffbeb",
          border: `1px solid ${isBlock ? "#fca5a5" : "#fde68a"}`,
          color: isBlock ? "#991b1b" : "#92400e",
          borderRadius: "99px", padding: "3px 10px",
          fontSize: "11px", fontWeight: "600",
        });
        pillsWrap.appendChild(pill);
      }
      body.appendChild(pillsWrap);

      appendAwarenessSection(body, decision.detections || [], () =>
        body.querySelector("[data-ca-image-actions]")
      );

      // Description
      const desc = Object.assign(document.createElement("div"), {
        textContent: isBlock
          ? __("cs_img_desc_block")
          : __("cs_img_desc_warn"),
      });
      Object.assign(desc.style, {
        fontSize: "13px", color: "#475569", lineHeight: "1.5",
        marginBottom: "18px",
      });
      body.appendChild(desc);

      // Action buttons
      const btnRow = document.createElement("div");
      btnRow.setAttribute("data-ca-image-actions", "true");
      Object.assign(btnRow.style, {
        display: "flex", gap: "10px", justifyContent: "flex-end",
      });

      function mkBtn(text, variant) {
        const btn = document.createElement("button");
        btn.textContent = text;
        const styles = {
          block: {
            background: "#ef4444", color: "#fff", border: "none",
            padding: "8px 18px", borderRadius: "8px", fontWeight: "600",
            fontSize: "13px", cursor: "pointer",
          },
          warn: {
            background: "#f59e0b", color: "#fff", border: "none",
            padding: "8px 18px", borderRadius: "8px", fontWeight: "600",
            fontSize: "13px", cursor: "pointer",
          },
          ghost: {
            background: "transparent", color: "#64748b",
            border: "1.5px solid #e2e8f0",
            padding: "8px 18px", borderRadius: "8px", fontWeight: "500",
            fontSize: "13px", cursor: "pointer",
          },
        };
        Object.assign(btn.style, styles[variant] || styles.ghost);
        return btn;
      }

      const cleanup = (proceed) => {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        overlay.remove();
        resolve(proceed);
      };

      if (isBlock) {
        const okBtn = mkBtn(__("cs_remove_image"), "block");
        okBtn.addEventListener("click", () => cleanup(false));
        btnRow.appendChild(okBtn);
      } else {
        const cancelBtn = mkBtn(__("cs_btn_cancel"), "ghost");
        const proceedBtn = mkBtn(__("cs_send_anyway"), "warn");
        cancelBtn.addEventListener("click", () => cleanup(false));
        proceedBtn.addEventListener("click", () => cleanup(true));
        btnRow.append(cancelBtn, proceedBtn);
      }

      body.appendChild(btnRow);
      card.append(header, body);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // Close on backdrop click (WARN only — BLOCK must read the modal).
      if (!isBlock) {
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) cleanup(false);
        });
      }
    });
  }

  /**
   * Analyze an image file and enforce the moderation decision.
   * Called on every image attached via file input or clipboard paste.
   */
  async function getImageModerationSetting() {
    try {
      const data = await chrome.storage.sync.get(["imageModerationEnabled"]);
      return data.imageModerationEnabled !== false; // default on
    } catch {
      return true;
    }
  }

  async function moderateImageFile(file, inputElement) {
    const cfg = getActiveSiteConfig();
    if (!cfg) return;
    if (!(cfg.features || []).includes("imageModeration")) return;
    if (extensionContextInvalid) return;

    const imageModEnabled = await getImageModerationSetting();
    if (!imageModEnabled) return;

    // Only process image files.
    if (!file || !file.type.startsWith("image/")) return;

    // Create a preview URL BEFORE we potentially clear the input.
    const previewObjectUrl = URL.createObjectURL(file);

    let encoded;
    try {
      encoded = await resizeAndEncodeImage(file);
    } catch {
      URL.revokeObjectURL(previewObjectUrl);
      return; // If we can't read the image, fail-open.
    }

    const toastId = `img-analyzing-${Date.now()}`;
    showToast(__("cs_analyzing_image"), "info");

    const result = await safeSendMessage({
      type: "ANALYZE_IMAGE",
      payload: {
        requestId: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        platform: cfg.id,
        imageBase64: encoded.base64,
        imageMimeType: encoded.mimeType,
        metadata: { pageUrl: window.location.href },
      },
    });

    if (!result?.ok) {
      URL.revokeObjectURL(previewObjectUrl);
      return; // API unavailable — fail-open.
    }

    const decision = result.data;
    if (decision.action === "ALLOW") {
      URL.revokeObjectURL(previewObjectUrl);
      return;
    }

    // Show modal with blurred preview.
    const proceed = await showImageModerationModal(decision, file.name, previewObjectUrl);

    if (!proceed) {
      // User chose NOT to send (Cancel on WARN, or "Remove image" on BLOCK).
      // Always gate the Send button regardless of action severity.
      // React-based platforms (ChatGPT, Claude, etc.) may have already accepted
      // the file into their internal state — clearFileInput only resets the DOM
      // element, not the platform's React state.  The banner forces the user to
      // explicitly confirm they removed the image preview before Send is re-enabled.
      clearFileInput(inputElement);
      blockedImagePending = true;
      showBlockedImageBanner();
    }
    // If proceed=true (WARN only, user explicitly chose "Send anyway"), the file
    // stays in the input and the message is allowed through.
  }

  /**
   * Wire up image interception via file input change events.
   * Uses capture phase so we can inspect files before any platform handler runs.
   */
  function interceptImageUploads() {
    document.addEventListener(
      "change",
      async (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
        const cfg = getActiveSiteConfig();
        if (!cfg || !(cfg.features || []).includes("imageModeration")) return;

        const files = Array.from(input.files || []).filter((f) =>
          f.type.startsWith("image/")
        );
        // If the user selected new files, clear any previous block state —
        // the new files will be analysed and a new block set if necessary.
        if (files.length > 0 && blockedImagePending) {
          clearBlockedImagePending();
        }
        // An empty change (user cancelled the picker) means they removed the image.
        if (files.length === 0 && blockedImagePending) {
          clearBlockedImagePending();
        }
        // Process images sequentially to avoid race conditions on the same input.
        for (const file of files) {
          await moderateImageFile(file, input);
        }
      },
      true // capture phase
    );

    // Clipboard paste (Ctrl+V / Cmd+V with an image in clipboard).
    document.addEventListener(
      "paste",
      async (event) => {
        const cfg = getActiveSiteConfig();
        if (!cfg || !(cfg.features || []).includes("imageModeration")) return;

        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter((i) => i.type.startsWith("image/"));
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (!file) continue;
          // For paste, we can't "clear" the clipboard data directly.
          // We show the modal; if BLOCK or user cancels, we show a toast.
          const previewObjectUrl = URL.createObjectURL(file);
          let encoded;
          try {
            encoded = await resizeAndEncodeImage(file);
          } catch {
            URL.revokeObjectURL(previewObjectUrl);
            continue;
          }
          showToast(__("cs_analyzing_paste"), "info");
          const result = await safeSendMessage({
            type: "ANALYZE_IMAGE",
            payload: {
              requestId: `img-paste-${Date.now()}`,
              platform: cfg.id,
              imageBase64: encoded.base64,
              imageMimeType: encoded.mimeType,
              metadata: { pageUrl: window.location.href },
            },
          });
          if (!result?.ok) { URL.revokeObjectURL(previewObjectUrl); continue; }
          const decision = result.data;
          if (decision.action === "ALLOW") { URL.revokeObjectURL(previewObjectUrl); continue; }
          // Show modal — if not proceeding, gate the Send button and show a banner
          // so the user must confirm they have manually removed the pasted image.
          // (We cannot un-paste, but we can block sending until confirmed.)
          const proceed = await showImageModerationModal(decision, "pasted image", previewObjectUrl);
          if (!proceed) {
            blockedImagePending = true;
            showBlockedImageBanner();
          }
        }
      },
      true
    );
  }

  function replaySubmission(promptElementHint) {
    const promptElement =
      promptElementHint && promptElementHint instanceof HTMLElement && promptElementHint.isConnected
        ? promptElementHint
        : getPromptElement(null);
    const promptForm = promptElement instanceof HTMLElement ? promptElement.closest("form") : null;
    if (promptForm && typeof promptForm.requestSubmit === "function") {
      replayingSubmission = true;
      promptForm.requestSubmit();
      setTimeout(() => {
        replayingSubmission = false;
      }, 0);
      return;
    }

    const sendButton = getSendButton();
    replayingSubmission = true;
    if (sendButton) {
      sendButton.click();
      setTimeout(() => {
        replayingSubmission = false;
      }, 0);
      return;
    }

    if (promptElement instanceof HTMLElement) {
      promptElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
    setTimeout(() => {
      replayingSubmission = false;
    }, 0);
  }

  function scheduleReplaySubmission(promptElementHint) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => replaySubmission(promptElementHint), 0);
      });
    });
  }

  async function analyzeAndMaybeBlock(event) {
    const cfg = getActiveSiteConfig();
    if (!cfg) return;
    if (!(cfg.features || []).includes("textAnalysis")) return;
    if (!contentModerationEnabled) return;
    if (extensionContextInvalid) return;
    if (replayingSubmission) return;

    // ── Blocked-image gate ───────────────────────────────────────────────────
    // A previous image moderation returned BLOCK. Prevent ANY post/send action
    // until the user explicitly acknowledges they removed the image.
    if (blockedImagePending) {
      event.preventDefault();
      event.stopPropagation();
      showBlockedImageBanner(); // ensure banner is visible
      showToast(__("cs_remove_blocked"), "warning");
      return;
    }

    // Pause submit flow while we call the API and decide action.
    event.preventDefault();
    event.stopPropagation();

    const el = getPromptElement(event);
    const prompt = readPromptValue(el);
    if (!prompt.trim()) {
      await reportSiteSignal("PROMPT_ELEMENT_NOT_FOUND", "Submit intercepted but no prompt element detected.");
      replaySubmission(el);
      return;
    }

    const promptHash = hashString(prompt);
    if (manualWarnBypassHash && manualWarnBypassHash === promptHash) {
      manualWarnBypassHash = null;
      replaySubmission(el);
      return;
    }

    const payload = {
      requestId: `req-${Date.now()}`,
      platform: cfg.id,
      prompt,
      userConsent: false,
      metadata: {
        pageUrl: window.location.href,
      },
    };

    const result = await safeSendMessage({
      type: "ANALYZE_PROMPT",
      payload,
    });

    if (!result?.ok) {
      if (isContextInvalidError(result?.error)) {
        await reportSiteSignal("EXTENSION_CONTEXT_INVALIDATED", String(result?.error || ""));
        notifyExtensionReloadRequired();
        return;
      }
      // V1 uses fail-open behavior to avoid breaking user workflows.
      // Enterprise deployments may require a fail-close policy.
      console.warn("Confidential Agent API unavailable:", result?.error);
      await reportSiteSignal("API_UNREACHABLE", String(result?.error || ""));
      replaySubmission(el);
      return;
    }

    const decision = result.data;
    if (decision.action === "ALLOW") {
      replaySubmission(el);
      return;
    }

    // ── Compute the best available redacted version ───────────────────────────
    // Prefer server-side redactions (precise, value-specific) over local regex.
    const serverRedacted = applyServerRedactions(prompt, decision.redactions);
    const localRedacted  = redactorApi.applyLocalRedaction(prompt).text || prompt;
    // Use whichever actually changed the text; fall back to the other.
    const bestRedacted = (serverRedacted && serverRedacted !== prompt)
      ? serverRedacted
      : localRedacted;

    // ── Auto-anonymize mode: silently redact and send for ALL actions ─────────
    // This includes BLOCK — if redactions cover the sensitive data it is safe to send.
    const autoAnonymize = await getAutoAnonymizeSetting();
    if (autoAnonymize) {
      if (bestRedacted && bestRedacted !== prompt) {
        writePromptValue(el, bestRedacted);
        const actionLabel = {
          BLOCK:     __("cs_auto_block"),
          WARN:      __("cs_auto_warn"),
          ANONYMIZE: __("cs_auto_anon"),
        }[decision.action] || __("cs_auto_generic");
        showToast(__("cs_auto_sent", { label: actionLabel }), "success");
        setTimeout(() => {
          manualWarnBypassHash = hashString(bestRedacted);
          scheduleReplaySubmission(el);
        }, 600);
      return;
      }
      // Semantic-only detection — no exact value to replace (e.g. LLM flagged
      // a combination of fields with no precise match).
      // Fall through to the review panel so the user can edit manually.
      showToast(__("cs_auto_fail"), "warning");
    }

    // ── Manual mode (or unreductable semantic content): show the review panel ─
    // The editor pre-loads with the ALREADY ANONYMIZED text so the user only
    // needs to confirm or make minor edits before sending.

    const decisionAction = String(decision.action || "");
    const decisionDetections = Array.isArray(decision.detections) ? decision.detections : [];
    const hasToxicDetection = decisionDetections.some((d) => d?.type === "TOXIC_LANGUAGE");
    const hasRephraseSuggestions = Array.isArray(decision.suggestions) && decision.suggestions.length > 0;
    const shouldOfferRephraseFirst =
      decisionAction === "SUGGEST_REPHRASE"
      || (
        (decisionAction === "WARN" || decisionAction === "ANONYMIZE")
        && hasToxicDetection
        && hasRephraseSuggestions
      );

    // ── Rephrase-first path: always offer suggestions when toxicity is present ─
    if (shouldOfferRephraseFirst) {
      const rephraseOnlyDecision = decisionAction === "SUGGEST_REPHRASE";
      const rephrase = await showRephraseModal({
        suggestions: decision.suggestions || [],
        detections: decisionDetections,
        riskScore: decision.riskScore || decision.risk_score || 0,
        originalPrompt: prompt,
      });

      if (!rephrase || rephrase.status === "cancel") {
        showUserAlert(__("cs_msg_not_sent"));
        return;
      }
      if (rephrase.status === "original") {
        if (rephraseOnlyDecision) {
          // Pure toxicity path: allow one submit bypass to avoid an infinite loop.
          manualWarnBypassHash = hashString(prompt);
          showToast(__("cs_sending_original"), "info");
          replaySubmission(el);
          return;
        }
        // Mixed risk path (toxicity + sensitive detections): continue to the
        // regular review modal so DLP actions remain enforced.
      } else if (rephrase.status === "auto" || rephrase.status === "manual") {
        const chosenText = String(rephrase.prompt || "");
        if (!chosenText.trim()) { showUserAlert(__("cs_msg_empty")); return; }
        writePromptValue(el, chosenText);
        if (rephraseOnlyDecision) {
          // Keep current UX for pure toxicity: user clicks Send manually.
          manualWarnBypassHash = hashString(chosenText);
          showToast(__("cs_msg_updated"), "success");
          return;
        }
        // Mixed risk path: re-run full analysis on the edited text so privacy
        // checks/redactions still apply.
        showToast(__("cs_msg_updated"), "success");
        scheduleReplaySubmission(el);
        return;
      }
      if (rephraseOnlyDecision) {
        // Fallback for pure toxicity path: allow original once.
        manualWarnBypassHash = hashString(prompt);
        replaySubmission(el);
        return;
      }
      // Mixed path fallback: continue to standard review below.
    }

    if (decision.action === "BLOCK" || decision.action === "WARN" || decision.action === "ANONYMIZE") {
      const review = await showPromptReviewModal({
        action: decision.action,
        reasons: decision.reasons,
        detections: decision.detections || [],
        riskScore: decision.riskScore || decision.risk_score || 0,
        originalPrompt: prompt,
        suggestedPrompt: bestRedacted,
      });

      if (review?.status === "fallback") {
        console.warn("Confidential Agent modal fallback:", review.error);
        const useAuto = await showQuickConfirm(
          __("cs_fallback_confirm")
        );
        if (useAuto) {
          writePromptValue(el, bestRedacted);
          showToast(__("cs_prompt_auto_filtered"), "success");
          return;
        }
        showToast(__("cs_prompt_not_sent"), "info");
        return;
      }

      if (!review || review.status === "cancel") {
        showUserAlert(__("cs_prompt_not_sent_alt"));
        return;
      }

      if (review.status === "manual") {
        const manualPrompt = String(review.prompt || "");
        if (!manualPrompt.trim()) {
          showUserAlert(__("cs_manual_empty"));
          return;
        }
        if (manualPrompt === prompt) {
          // The editor was pre-populated with the anonymized version; if it still
          // matches the original, no redaction was possible — ask the user to edit.
          if (hasRedactedPlaceholders(manualPrompt)) {
            const continueSend = await showQuickConfirm(
              __("cs_confirm_placeholders")
            );
            if (continueSend) {
              manualWarnBypassHash = hashString(manualPrompt);
              scheduleReplaySubmission(el);
              return;
            }
          }
          showUserAlert(
            __("cs_could_not_redact")
          );
          return;
        }
        // After any successful manual edit, the next Send must skip re-analysis for this exact text
        // (BLOCK / ANONYMIZE previously only set bypass for WARN, which caused a repeat modal).
        manualWarnBypassHash = hashString(manualPrompt);
        writePromptValue(el, manualPrompt);
        showUserAlert(__("cs_edited_ready"));
        return;
      }

      if (review.status === "auto") {
        if (review.prompt === prompt) {
          if (decision.action !== "BLOCK" && hasRedactedPlaceholders(prompt)) {
            const continueSend = await showQuickConfirm(
              __("cs_confirm_placeholders_ok")
            );
            if (continueSend) {
              manualWarnBypassHash = hashString(prompt);
              scheduleReplaySubmission(el);
              return;
            }
          }
          showUserAlert(
            __("cs_no_auto_redact")
          );
          return;
        }
        writePromptValue(el, review.prompt);
        if (decision.action !== "BLOCK") {
          manualWarnBypassHash = hashString(String(review.prompt || ""));
          scheduleReplaySubmission(el);
          return;
        }
        showUserAlert(__("cs_auto_filtered_review"));
      }
      return;
    }
  }

  // Per-node map: tracks the text that was last SUBMITTED to the API.
  // Used to skip re-analysis of text that hasn't changed between scans
  // (happens frequently during streaming when tokens arrive quickly).
  const _nodeSubmittedText = new WeakMap();

  async function analyzeResponseNode(node) {
    const cfg = getActiveSiteConfig();
    if (!cfg) return;
    if (!(cfg.features || []).includes("textAnalysis")) return;
    if (!contentModerationEnabled) return;
    if (extensionContextInvalid) return;
    const responseText = normalizeText(node.innerText || node.textContent || "");
    // Require at least 60 chars — avoids analysing partial streaming tokens.
    if (!responseText || responseText.length < 60) return;

    const hash = hashString(responseText);
    // Skip if already reviewed with this exact content.
    if (isAlreadyReviewed(node, hash)) return;
    // Skip if this exact text was already sent to the API (deduplication).
    if (analyzedResponseHashes.has(hash)) return;
    // Skip if text hasn't changed since the last analysis attempt on this node.
    if (_nodeSubmittedText.get(node) === responseText) return;

    analyzedResponseHashes.add(hash);
    markReviewed(node, hash);
    _nodeSubmittedText.set(node, responseText);

    // Show a brief scanning indicator so the user knows AVS is active.
    // Use a unique toast ID so multiple concurrent scans collapse into one.
    showToast(__("cs_scanning"), "info");

    const payload = {
      requestId: `resp-${Date.now()}-${hash}`,
      platform: cfg.id,
      responseText,
      metadata: {
        pageUrl: window.location.href,
      },
    };

    const result = await safeSendMessage({
      type: "ANALYZE_RESPONSE",
      payload,
    });

    if (!result?.ok) {
      if (isContextInvalidError(result?.error)) {
        return;
      }
      console.warn("[Confidential Agent] Response API unavailable:", result?.error);
      return;
    }

    const decision = result.data;
    if (decision.action === "ALLOW") {
      // Response is clean — show a brief reassuring confirmation.
      showToast(__("cs_response_clean"), "success");
      return;
    }

    if (decision.action === "BLOCK") {
      // Preferred path: blur only the identified sensitive fragments.
      // The rest of the response remains fully readable.
      const surgicalOk = redactResponseNodeSurgically(node, decision.redactions, "BLOCK");
      if (surgicalOk) {
        insertResponseNotice(node, {
          icon: "🛡",
          message: __("cs_response_blurred"),
          color: "#7f1d1d",
          bgColor: "#fef2f2",
          borderColor: "#fca5a5",
        });
      } else {
        // Fallback: no specific fragments identified (semantic-only LLM detection).
        // Try local regex before resorting to full-node masking.
        const { applied } = redactorApi.applyLocalRedaction(
          normalizeText(node.innerText || node.textContent || "")
        );
        const localOk = redactResponseNodeSurgically(node, applied, "BLOCK");
        if (localOk) {
          insertResponseNotice(node, {
            icon: "🛡",
            message: __("cs_response_blurred"),
            color: "#7f1d1d",
            bgColor: "#fef2f2",
            borderColor: "#fca5a5",
          });
        } else {
          // No identifiable fragments at all — show a prominent warning but
          // do NOT hide the full response. The user can judge the content.
          insertResponseNotice(node, {
            icon: "⚠️",
            message: __("cs_response_flagged"),
            color: "#7c2d12",
            bgColor: "#fff7ed",
            borderColor: "#fed7aa",
          });
        }
      }
      return;
    }

    if (decision.action === "ANONYMIZE") {
      // Replace sensitive values with [REDACTED_TYPE] pills.
      const surgicalOk = redactResponseNodeSurgically(node, decision.redactions, "ANONYMIZE");
      if (!surgicalOk) {
        redactResponseNode(node); // local regex fallback
      }
      showToast(__("cs_response_anon"), "warning");
      return;
    }

    if (decision.action === "WARN") {
      // Highlight sensitive fragments inline, then show warning banner.
      redactResponseNodeSurgically(node, decision.redactions, "WARN");
      showResponseWarningBanner(
        node,
        __("cs_response_warn"),
        (keepVisible) => {
          if (!keepVisible) {
            maskResponseNode(node, __("cs_mask_hidden"));
          }
        }
      );
      return;
    }

    if (decision.action === "SUGGEST_REPHRASE") {
      // The AI's response itself contains offensive, aggressive, or inappropriate
      // language.  We cannot rephrase a generated response, so we warn the user
      // and give them the option to hide it entirely.
      const toxicDetections = (decision.detections || [])
        .filter((d) => d.type === "TOXIC_LANGUAGE")
        .map((d) => d.valuePreview)
        .join(", ");
      const bannerMsg = toxicDetections
        ? __("cs_toxic_with_samples", { samples: toxicDetections })
        : __("cs_toxic_generic");
      showResponseWarningBanner(node, bannerMsg, (keepVisible) => {
        if (!keepVisible) {
          maskResponseNode(node, __("cs_mask_offensive"));
        }
      });
      insertResponseNotice(node, {
        icon: "💬",
        message: bannerMsg,
        color: "#5b21b6",
        bgColor: "#f5f3ff",
        borderColor: "#ddd6fe",
      });
      return;
    }
  }

  async function scanResponses() {
    const nodes = getResponseCandidates();
    if (nodes.length === 0) return;
    // Process nodes sequentially to avoid flooding the API with parallel calls.
    for (const node of nodes) {
      await analyzeResponseNode(node).catch(() => {});
    }
  }

  function scheduleResponseScan() {
    if (extensionContextInvalid || !getActiveSiteConfig()) return;
    if (responseScanTimer) clearTimeout(responseScanTimer);
    // Use 700ms debounce (up from 350ms) so streaming responses have time to
    // finish before we analyse them — avoids calling the API on every token.
    responseScanTimer = setTimeout(() => {
      scanResponses().catch((error) => {
        console.warn("[Confidential Agent] Response scan error:", error);
      });
    }, 700);
  }

  document.addEventListener(
    "focusin",
    (event) => {
      const t = event.target;
      if (t instanceof HTMLElement && isPromptLikeElement(t) && isVisibleElement(t)) {
        lastFocusedPrompt = t;
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      // Intercept Enter (without Shift), usually used to submit.
      if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        analyzeAndMaybeBlock(event);
      }
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      if (matchesSendButton(event)) {
        analyzeAndMaybeBlock(event);
      }
    },
    true
  );

  // Start image upload interception (file inputs + clipboard paste).
  interceptImageUploads();

  domObserver = new MutationObserver(() => {
    scheduleResponseScan();
  });
  domObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  chrome.storage.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    if (
      !changes.guardrailEnabled &&
      !changes.contentModerationEnabled &&
      !changes.enabledPlatformIds &&
      !changes.customDomains &&
      !changes.userAddedPlatforms
    ) {
      return;
    }
    refreshCurrentSiteConfig().then(() => {
      scheduleResponseScan();
    });
  });
  if (getActiveSiteConfig()) {
    reportSiteSignal("SITE_SELECTED", "Guardrail active for this host.").catch(() => {});
  }
  scheduleResponseScan();
})();
