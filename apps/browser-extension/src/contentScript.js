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
      ]);
      return {
        guardrailEnabled: data.guardrailEnabled !== false,
        enabledPlatformIds: Array.isArray(data.enabledPlatformIds) ? data.enabledPlatformIds : undefined,
        customDomains: Array.isArray(data.customDomains) ? data.customDomains : [],
      };
    } catch (_error) {
      return {
        guardrailEnabled: true,
        enabledPlatformIds: undefined,
        customDomains: [],
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
      if (matched instanceof HTMLButtonElement) return true;
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

  function maskResponseNode(node, label) {
    if (!(node instanceof HTMLElement)) return;
    node.dataset.confidentialAgentMasked = "true";
    node.style.filter = "blur(8px)";
    node.style.pointerEvents = "none";
    node.style.userSelect = "none";
    node.style.opacity = "0.4";
    node.style.transition = "all 0.3s ease";
    if (node.previousElementSibling?.dataset?.confidentialAgentNotice === "true") return;
    const notice = document.createElement("div");
    notice.dataset.confidentialAgentNotice = "true";
    Object.assign(notice.style, {
      margin: "8px 0", padding: "10px 14px",
      background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "10px",
      display: "flex", alignItems: "center", gap: "10px",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      fontSize: "13px", color: "#7f1d1d", lineHeight: "1.4",
    });
    const ico = Object.assign(document.createElement("span"), { textContent: "🛡" });
    ico.style.flexShrink = "0";
    const txt = Object.assign(document.createElement("span"), { textContent: label });
    notice.append(ico, txt);
    node.parentElement?.insertBefore(notice, node);
  }

  function redactResponseNode(node) {
    if (!(node instanceof HTMLElement)) return;
    const sourceText = normalizeText(node.innerText || node.textContent || "");
    if (!sourceText) return;
    const redacted = redactorApi.applyLocalRedaction(sourceText);
    if (redacted.text && redacted.text !== sourceText) {
      node.innerText = redacted.text;
    }
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
    if (extensionContextInvalid) {
      return;
    }
    if (replayingSubmission) {
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
      maskResponseNode(node, "Response blocked: sensitive content detected.");
      return;
    }

    if (decision.action === "ANONYMIZE") {
      redactResponseNode(node);
      showToast("Response anonymized — sensitive data replaced with placeholders.", "warning");
      return;
    }

    if (decision.action === "WARN") {
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
