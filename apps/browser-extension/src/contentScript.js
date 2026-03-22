(async function bootstrap() {
  const siteConfigApi = window.ConfidentialAgentSiteConfigs;
  const redactorApi = window.ConfidentialAgentRedactor;

  if (!siteConfigApi || !redactorApi) {
    return;
  }

  async function loadUserSiteSettings() {
    try {
      const data = await chrome.storage.sync.get([
        "guardrailEnabled",
        "enabledPlatformIds",
        "customDomains",
        "userAddedPlatforms",
      ]);
      return {
        guardrailEnabled: data.guardrailEnabled !== false,
        enabledPlatformIds: Array.isArray(data.enabledPlatformIds) ? data.enabledPlatformIds : [],
        customDomains: Array.isArray(data.customDomains) ? data.customDomains : [],
        // Server-synced, per-user platforms
        userAddedPlatforms: Array.isArray(data.userAddedPlatforms) ? data.userAddedPlatforms : [],
      };
    } catch (_error) {
      return {
        guardrailEnabled: true,
        enabledPlatformIds: [],
        customDomains: [],
        userAddedPlatforms: [],
      };
    }
  }

  let currentSiteConfig = null;
  async function refreshCurrentSiteConfig() {
    const userSiteSettings = await loadUserSiteSettings();
    currentSiteConfig = siteConfigApi.resolveCurrentSiteConfig(
      window.location.hostname,
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
      textContent: "🚫  Blocked image detected — remove the image from your post before sending.",
    });
    const dismissBtn = document.createElement("button");
    dismissBtn.textContent = "I've removed it ✓";
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

  function getPromptElement() {
    const cfg = getActiveSiteConfig();
    const selectors = Array.isArray(cfg?.promptSelectors) ? cfg.promptSelectors : [];
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found instanceof HTMLElement) {
        return found;
      }
    }

    // Generic fallback if site-specific selectors fail.
    const textarea = document.querySelector("textarea");
    if (textarea instanceof HTMLElement) return textarea;
    const editable = document.querySelector('[contenteditable="true"]');
    if (editable instanceof HTMLElement) return editable;
    return null;
  }

  function getSendButton() {
    const cfg = getActiveSiteConfig();
    const selectors = Array.isArray(cfg?.sendButtonSelectors) ? cfg.sendButtonSelectors : [];
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button instanceof HTMLButtonElement && !button.disabled) {
        return button;
      }
    }
    return null;
  }

  function matchesSendButton(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest("[data-confidential-agent-modal='true']")) return false;
    const cfg = getActiveSiteConfig();
    if (!cfg) return false;

    const selectors = Array.isArray(cfg.sendButtonSelectors) ? cfg.sendButtonSelectors : [];
    for (const selector of selectors) {
      const matched = target.closest(selector);
      // Accept <button> elements and elements acting as buttons via role/aria.
      if (
        matched instanceof HTMLButtonElement ||
        (matched instanceof HTMLElement &&
          (matched.getAttribute("role") === "button" ||
           matched.tagName === "DIV" && matched.getAttribute("aria-label")))
      ) {
        return true;
      }
    }

    const text = (target.textContent || "").trim();
    if (!text) return false;
    return cfg.sendButtonPatterns.some((pattern) => pattern.test(text));
  }

  function readPromptValue(el) {
    if (!el) return "";
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return el.value || "";
    }
    return el.textContent || "";
  }

  function writePromptValue(el, value) {
    if (!el) return;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    el.textContent = value;
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
      noBtn.textContent = "Cancel";
      const yesBtn = document.createElement("button");
      Object.assign(yesBtn.style, {
        padding: "6px 14px", fontSize: "12px", fontWeight: "600",
        background: "#6366f1", border: "1.5px solid #6366f1",
        borderRadius: "7px", cursor: "pointer", color: "#fff",
      });
      yesBtn.textContent = "Confirm";
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
    keepBtn.textContent = "Keep visible";
    const hideBtn = document.createElement("button");
    Object.assign(hideBtn.style, {
      padding: "4px 10px", fontSize: "12px", fontWeight: "600",
      background: "#f59e0b", border: "1.5px solid #f59e0b", borderRadius: "6px",
      cursor: "pointer", color: "#fff",
    });
    hideBtn.textContent = "Hide";
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
    showToast("Extension updated — please refresh this tab to restore protection.", "warning");
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
        error: messageText || "Unknown extension messaging error",
      };
    }
  }

  function showPromptReviewModal({ action, reasons, detections = [], riskScore = 0, originalPrompt, suggestedPrompt }) {
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
        const titleText = isBlock ? "Prompt blocked" : isWarn ? "Sensitive data detected" : "Prompt will be anonymized";
        const headerEmoji = isBlock ? "🛡" : isWarn ? "⚠" : "🔵";

        const TYPE_LABELS = {
          API_KEY: "🔑 API Key", PASSWORD: "🔒 Password", TOKEN: "🎫 Token",
          EMAIL: "✉ Email", PHONE: "📞 Phone", IBAN: "🏦 IBAN",
          SOURCE_CODE: "💻 Source code", INTERNAL_URL: "🔗 Internal URL",
          PROMPT_INJECTION: "⚠ Injection", LLM_SENSITIVE: "🤖 Semantic PII",
        };

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
        hSub.textContent = "Confidential Agent";

        hMeta.append(hTitle, hSub);

        const closeBtn = document.createElement("button");
        Object.assign(closeBtn.style, {
          background: "none", border: "none", cursor: "pointer",
          color: "#94a3b8", fontSize: "20px", lineHeight: "1",
          padding: "2px 4px", borderRadius: "4px", display: "flex", alignItems: "center",
        });
        closeBtn.textContent = "×";
        closeBtn.setAttribute("aria-label", "Close");

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
            pill.textContent = TYPE_LABELS[d.type] || d.type;
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
          const barLbl = Object.assign(document.createElement("span"), { textContent: "Risk score" });
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
          ? "This prompt cannot be sent. Remove the flagged data before retrying."
          : isWarn
          ? "Review the detected content. You can auto-filter or edit manually before sending."
          : "Sensitive data will be replaced with placeholders before the prompt is sent.";
        body.appendChild(desc);

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
          ? "Anonymized prompt — review before sending"
          : "Your prompt — edit to remove sensitive data";

        const ta = document.createElement("textarea");
        // Pre-load with the anonymized version so the user only needs to
        // confirm or make minor adjustments — not re-do the entire redaction.
        ta.value = suggestedPrompt || originalPrompt;
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

        const autoBtn     = !isBlock ? mkBtn("Auto-filter & send", "primary") : null;
        const editBtn     = mkBtn("Edit", "secondary");
        const sendEditBtn = mkBtn("Send edited", "primary");
        sendEditBtn.style.display = "none";
        const cancelBtn   = mkBtn("Cancel", "ghost");

        let editOpen = false;
        function toggleEdit() {
          editOpen = !editOpen;
          editWrap.style.display    = editOpen ? "block" : "none";
          sendEditBtn.style.display = editOpen ? "" : "none";
          editBtn.textContent       = editOpen ? "Hide editor" : "Edit";
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
          error: error instanceof Error ? error.message : "Unknown modal rendering error",
        });
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
        textContent: isBlock ? "Image blocked" : "Sensitive image detected",
      });
      Object.assign(titleEl.style, {
        fontWeight: "700", fontSize: "15px",
        color: isBlock ? "#991b1b" : "#92400e",
      });
      const subtitleEl = Object.assign(document.createElement("div"), {
        textContent: "Confidential Agent",
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
          textContent: fileName || "image",
        });
        Object.assign(fileNameEl.style, {
          fontWeight: "600", fontSize: "13px", color: "#1e293b",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          maxWidth: "220px",
        });
        const statusEl = Object.assign(document.createElement("div"), {
          textContent: isBlock
            ? "Upload prevented — content policy violation"
            : "Potentially violates content policy",
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
        textContent: "Detected content",
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
        IMAGE_VIOLENCE: "⚠️",
        IMAGE_VIOLENCE_GRAPHIC: "🩸",
        IMAGE_SELF_HARM: "🆘",
        IMAGE_HATE: "⛔",
        IMAGE_HARASSMENT: "🚨",
        IMAGE_ILLICIT: "🔒",
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

      // Description
      const desc = Object.assign(document.createElement("div"), {
        textContent: isBlock
          ? "This image cannot be uploaded. It contains content that violates safety policies."
          : "This image may contain sensitive content. Uploading could violate platform policies.",
      });
      Object.assign(desc.style, {
        fontSize: "13px", color: "#475569", lineHeight: "1.5",
        marginBottom: "18px",
      });
      body.appendChild(desc);

      // Action buttons
      const btnRow = document.createElement("div");
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
        const okBtn = mkBtn("Remove image", "block");
        okBtn.addEventListener("click", () => cleanup(false));
        btnRow.appendChild(okBtn);
      } else {
        const cancelBtn = mkBtn("Cancel", "ghost");
        const proceedBtn = mkBtn("Send anyway ⚠️", "warn");
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
    showToast(`Analyzing image…`, "info");

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
      clearFileInput(inputElement);

      if (decision.action === "BLOCK") {
        // Even though the file input is cleared, React-based platforms (Facebook,
        // Instagram, etc.) may have already accepted the file. Keep the send button
        // gated until the user confirms they have removed the image preview.
        blockedImagePending = true;
        showBlockedImageBanner();
      }
    }
    // If proceed=true (WARN and user chose to continue), the file stays in the input.
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
          showToast("Analyzing pasted image…", "info");
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
          // Show modal — if not proceeding we can't undo the paste, so we warn
          // and show a toast so the user knows to delete the pasted image manually.
          const proceed = await showImageModerationModal(decision, "pasted image", previewObjectUrl);
          if (!proceed) {
            showToast(
              "Image flagged — please remove it from the chat before sending.",
              "warning"
            );
          }
        }
      },
      true
    );
  }

  function replaySubmission() {
    const promptElement = getPromptElement();
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

  async function analyzeAndMaybeBlock(event) {
    const cfg = getActiveSiteConfig();
    if (!cfg) return;
    if (extensionContextInvalid) return;
    if (replayingSubmission) return;

    // ── Blocked-image gate ───────────────────────────────────────────────────
    // A previous image moderation returned BLOCK. Prevent ANY post/send action
    // until the user explicitly acknowledges they removed the image.
    if (blockedImagePending) {
      event.preventDefault();
      event.stopPropagation();
      showBlockedImageBanner(); // ensure banner is visible
      showToast("🚫 Remove the blocked image before posting.", "warning");
      return;
    }

    // Pause submit flow while we call the API and decide action.
    event.preventDefault();
    event.stopPropagation();

    const el = getPromptElement();
    const prompt = readPromptValue(el).trim();
    if (!prompt) {
      await reportSiteSignal("PROMPT_ELEMENT_NOT_FOUND", "Submit intercepted but no prompt element detected.");
      replaySubmission();
      return;
    }

    const promptHash = hashString(prompt);
    if (manualWarnBypassHash && manualWarnBypassHash === promptHash) {
      manualWarnBypassHash = null;
      replaySubmission();
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
      replaySubmission();
      return;
    }

    const decision = result.data;
    if (decision.action === "ALLOW") {
      replaySubmission();
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
          BLOCK:     "Critical data redacted",
          WARN:      "Sensitive content removed",
          ANONYMIZE: "Personal data anonymized",
        }[decision.action] || "Data anonymized";
        showToast(`${actionLabel} — prompt sent automatically.`, "success");
        setTimeout(() => {
          manualWarnBypassHash = hashString(bestRedacted.trim());
          replaySubmission();
        }, 600);
        return;
      }
      // Semantic-only detection — no exact value to replace (e.g. LLM flagged
      // a combination of fields with no precise match).
      // Fall through to the review panel so the user can edit manually.
      showToast("Could not auto-redact — please review and edit manually.", "warning");
    }

    // ── Manual mode (or unreductable semantic content): show the review panel ─
    // The editor pre-loads with the ALREADY ANONYMIZED text so the user only
    // needs to confirm or make minor edits before sending.

    if (decision.action === "BLOCK" || decision.action === "WARN" || decision.action === "ANONYMIZE") {
      const review = await showPromptReviewModal({
        action: decision.action,
        reasons: decision.reasons,
        detections: decision.detections || [],
        riskScore: decision.risk_score || 0,
        originalPrompt: prompt,
        suggestedPrompt: bestRedacted,
      });

      if (review?.status === "fallback") {
        console.warn("Confidential Agent modal fallback:", review.error);
        const useAuto = await showQuickConfirm(
          "Review panel could not be rendered. Apply auto-filter and continue?"
        );
        if (useAuto) {
          writePromptValue(el, bestRedacted);
          showToast("Prompt auto-filtered. Review it, then click Send.", "success");
          return;
        }
        showToast("Prompt not sent. You can edit and retry.", "info");
        return;
      }

      if (!review || review.status === "cancel") {
        showUserAlert("Prompt not sent. You can edit and retry.");
        return;
      }

      if (review.status === "manual") {
        const manualPrompt = String(review.prompt || "").trim();
        if (!manualPrompt) {
          showUserAlert("Prompt is empty. Please edit and retry.");
          return;
        }
        if (manualPrompt === prompt) {
          // The editor was pre-populated with the anonymized version; if it still
          // matches the original, no redaction was possible — ask the user to edit.
          if (hasRedactedPlaceholders(manualPrompt)) {
            const continueSend = await showQuickConfirm(
              "This prompt already contains redacted placeholders. Send it now?"
            );
            if (continueSend) {
              manualWarnBypassHash = hashString(manualPrompt);
              replaySubmission();
              return;
            }
          }
          showUserAlert(
            "Sensitive data could not be automatically redacted. Please edit the prompt manually to remove the flagged content."
          );
          return;
        }
        if (decision.action === "WARN") {
          // Allow one explicit retry after user manual review to avoid UX loops on medium risk.
          manualWarnBypassHash = hashString(manualPrompt);
        }
        writePromptValue(el, manualPrompt);
        showUserAlert("Your edited prompt is ready. Click Send when ready.");
        return;
      }

      if (review.status === "auto") {
        if (review.prompt === prompt) {
          if (decision.action !== "BLOCK" && hasRedactedPlaceholders(prompt)) {
            const continueSend = await showQuickConfirm(
              "No further redaction needed — this prompt already contains placeholders. Send now?"
            );
            if (continueSend) {
              manualWarnBypassHash = hashString(prompt);
              replaySubmission();
              return;
            }
          }
          showUserAlert(
            "No automatic redaction could be applied for this content. Please edit manually."
          );
          return;
        }
        writePromptValue(el, review.prompt);
        if (decision.action !== "BLOCK") {
          manualWarnBypassHash = hashString(String(review.prompt || "").trim());
          replaySubmission();
          return;
        }
        showUserAlert("Prompt auto-filtered. Review it, then click Send.");
      }
      return;
    }
  }

  async function analyzeResponseNode(node) {
    const cfg = getActiveSiteConfig();
    if (!cfg) return;
    if (extensionContextInvalid) return;
    const responseText = normalizeText(node.innerText || node.textContent || "");
    if (!responseText || responseText.length < 24) return;

    const hash = hashString(responseText);
    if (analyzedResponseHashes.has(hash) || isAlreadyReviewed(node, hash)) {
      return;
    }

    analyzedResponseHashes.add(hash);
    markReviewed(node, hash);

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
      console.warn("Confidential Agent response API unavailable:", result?.error);
      return;
    }

    const decision = result.data;
    if (decision.action === "ALLOW") return;

    if (decision.action === "BLOCK") {
      // Preferred path: blur only the identified sensitive fragments.
      // The rest of the response remains fully readable.
      const surgicalOk = redactResponseNodeSurgically(node, decision.redactions, "BLOCK");
      if (surgicalOk) {
        insertResponseNotice(node, {
          icon: "🛡",
          message: "Sensitive content has been blurred in this response.",
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
            message: "Sensitive content has been blurred in this response.",
            color: "#7f1d1d",
            bgColor: "#fef2f2",
            borderColor: "#fca5a5",
          });
        } else {
          // No identifiable fragments at all — show a prominent warning but
          // do NOT hide the full response. The user can judge the content.
          insertResponseNotice(node, {
            icon: "⚠️",
            message: "Confidential Agent flagged this response as potentially sensitive. Review carefully before using.",
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
      showToast("Sensitive data anonymized in response.", "warning");
      return;
    }

    if (decision.action === "WARN") {
      // Highlight sensitive fragments inline, then show warning banner.
      redactResponseNodeSurgically(node, decision.redactions, "WARN");
      showResponseWarningBanner(
        node,
        "This AI response may contain sensitive data.",
        (keepVisible) => {
          if (!keepVisible) {
            maskResponseNode(node, "Response hidden by Confidential Agent.");
          }
        }
      );
      return;
    }
  }

  async function scanResponses() {
    const nodes = getResponseCandidates();
    await Promise.all(nodes.map((node) => analyzeResponseNode(node)));
  }

  function scheduleResponseScan() {
    if (extensionContextInvalid || !getActiveSiteConfig()) return;
    if (responseScanTimer) {
      clearTimeout(responseScanTimer);
    }
    responseScanTimer = setTimeout(() => {
      scanResponses().catch((error) => {
        console.warn("Confidential Agent response scan failed:", error);
      });
    }, 350);
  }

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
      if (matchesSendButton(event.target)) {
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
      !changes.enabledPlatformIds &&
      !changes.customDomains
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
