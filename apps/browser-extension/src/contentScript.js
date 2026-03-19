(function bootstrap() {
  const siteConfigApi = window.ConfidentialAgentSiteConfigs;
  const redactorApi = window.ConfidentialAgentRedactor;

  if (!siteConfigApi || !redactorApi) {
    return;
  }

  const siteConfig = siteConfigApi.resolveCurrentSiteConfig(window.location.hostname);
  if (!siteConfig) {
    return;
  }
  let replayingSubmission = false;
  const analyzedResponseHashes = new Set();
  let responseScanTimer = null;
  let promptModalOpen = false;
  let extensionContextInvalid = false;
  let domObserver = null;
  let extensionReloadNoticeShown = false;
  let manualWarnBypassHash = null;

  function getPromptElement() {
    const selectors = Array.isArray(siteConfig.promptSelectors) ? siteConfig.promptSelectors : [];
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
    const selectors = Array.isArray(siteConfig.sendButtonSelectors) ? siteConfig.sendButtonSelectors : [];
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

    const selectors = Array.isArray(siteConfig.sendButtonSelectors) ? siteConfig.sendButtonSelectors : [];
    for (const selector of selectors) {
      const matched = target.closest(selector);
      if (matched instanceof HTMLButtonElement) return true;
    }

    const text = (target.textContent || "").trim();
    if (!text) return false;
    return siteConfig.sendButtonPatterns.some((pattern) => pattern.test(text));
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

  function showUserAlert(message) {
    // V1: minimal UX; V2 should move to a custom overlay component.
    window.alert(`[Confidential Agent] ${message}`);
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
    showUserAlert("Extension updated. Please refresh this tab to continue protected sending.");
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

  function showPromptReviewModal({ action, reasons, originalPrompt, suggestedPrompt }) {
    if (promptModalOpen) {
      return Promise.resolve({ status: "cancel", prompt: originalPrompt });
    }
    promptModalOpen = true;

    return new Promise((resolve) => {
      try {
        const overlay = document.createElement("div");
        overlay.dataset.confidentialAgentModal = "true";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(15, 23, 42, 0.55)";
      overlay.style.zIndex = "2147483647";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.padding = "16px";

        const panel = document.createElement("div");
      panel.style.width = "min(760px, 96vw)";
      panel.style.maxHeight = "86vh";
      panel.style.overflow = "auto";
      panel.style.background = "#fff";
      panel.style.borderRadius = "12px";
      panel.style.border = "1px solid #d0d7de";
      panel.style.boxShadow = "0 20px 40px rgba(0,0,0,0.25)";
      panel.style.padding = "16px";

        const title = document.createElement("h3");
      title.textContent = "Confidential Agent - Sensitive prompt detected";
      title.style.margin = "0 0 10px 0";

        const subtitle = document.createElement("p");
      subtitle.style.margin = "0 0 10px 0";
      subtitle.style.color = "#374151";
      subtitle.textContent =
        action === "BLOCK"
          ? "This prompt cannot be sent as-is. Edit it yourself or let Confidential Agent anonymize it."
          : "This prompt may contain sensitive data. Edit it yourself or let Confidential Agent anonymize it.";

        const reasonList = document.createElement("div");
      reasonList.style.margin = "0 0 10px 0";
      reasonList.style.color = "#6b7280";
      reasonList.style.fontSize = "13px";
      reasonList.textContent = `Reasons: ${Array.isArray(reasons) ? reasons.join(" | ") : "N/A"}`;

        const textArea = document.createElement("textarea");
      textArea.value = originalPrompt;
      textArea.style.width = "100%";
      textArea.style.minHeight = "180px";
      textArea.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
      textArea.style.fontSize = "13px";
      textArea.style.border = "1px solid #cbd5e1";
      textArea.style.borderRadius = "8px";
      textArea.style.padding = "10px";
      textArea.style.boxSizing = "border-box";

        const helper = document.createElement("p");
      helper.style.margin = "10px 0";
      helper.style.fontSize = "13px";
      helper.style.color = "#64748b";
      helper.textContent =
        "Choose one option: keep editing manually, auto-filter with Confidential Agent, or cancel.";

        const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.flexWrap = "wrap";
      actions.style.gap = "8px";
      actions.style.justifyContent = "flex-end";

        const manualBtn = document.createElement("button");
      manualBtn.type = "button";
      manualBtn.textContent = "Use my edited prompt";
      manualBtn.style.padding = "8px 12px";
      manualBtn.style.borderRadius = "8px";
      manualBtn.style.border = "1px solid #2563eb";
      manualBtn.style.background = "#2563eb";
      manualBtn.style.color = "#fff";
      manualBtn.style.cursor = "pointer";

        const autoBtn = document.createElement("button");
      autoBtn.type = "button";
      autoBtn.textContent = "Auto-filter with Confidential Agent";
      autoBtn.style.padding = "8px 12px";
      autoBtn.style.borderRadius = "8px";
      autoBtn.style.border = "1px solid #f59e0b";
      autoBtn.style.background = "#fff7ed";
      autoBtn.style.color = "#92400e";
      autoBtn.style.cursor = "pointer";

        const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.padding = "8px 12px";
      cancelBtn.style.borderRadius = "8px";
      cancelBtn.style.border = "1px solid #cbd5e1";
      cancelBtn.style.background = "#fff";
      cancelBtn.style.color = "#334155";
      cancelBtn.style.cursor = "pointer";

        function cleanupAndResolve(value) {
          promptModalOpen = false;
          overlay.remove();
          resolve(value);
        }

        manualBtn.addEventListener("click", () => {
          cleanupAndResolve({ status: "manual", prompt: textArea.value });
        });

        autoBtn.addEventListener("click", () => {
          cleanupAndResolve({ status: "auto", prompt: suggestedPrompt });
        });

        cancelBtn.addEventListener("click", () => {
          cleanupAndResolve({ status: "cancel", prompt: originalPrompt });
        });

        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) {
            cleanupAndResolve({ status: "cancel", prompt: originalPrompt });
          }
        });

        actions.append(cancelBtn, autoBtn, manualBtn);
        panel.append(title, subtitle, reasonList, textArea, helper, actions);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        textArea.focus();
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
    const selectors = Array.isArray(siteConfig.responseSelectors) ? siteConfig.responseSelectors : [];
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
    node.style.filter = "blur(6px)";
    node.style.pointerEvents = "none";
    node.style.userSelect = "none";
    if (!node.previousElementSibling || node.previousElementSibling.dataset?.confidentialAgentNotice !== "true") {
      const notice = document.createElement("div");
      notice.dataset.confidentialAgentNotice = "true";
      notice.style.margin = "8px 0";
      notice.style.padding = "8px";
      notice.style.border = "1px solid #e67e22";
      notice.style.borderRadius = "6px";
      notice.style.background = "#fff6ec";
      notice.style.color = "#8a4b08";
      notice.textContent = `[Confidential Agent] ${label}`;
      node.parentElement?.insertBefore(notice, node);
    }
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
      platform: siteConfig.id,
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
        notifyExtensionReloadRequired();
        return;
      }
      // V1 uses fail-open behavior to avoid breaking user workflows.
      // Enterprise deployments may require a fail-close policy.
      console.warn("Confidential Agent API unavailable:", result?.error);
      replaySubmission();
      return;
    }

    const decision = result.data;
    if (decision.action === "ALLOW") {
      replaySubmission();
      return;
    }

    if (decision.action === "BLOCK" || decision.action === "WARN" || decision.action === "ANONYMIZE") {
      const autoRedacted = redactorApi.applyLocalRedaction(prompt);
      const review = await showPromptReviewModal({
        action: decision.action,
        reasons: decision.reasons,
        originalPrompt: prompt,
        suggestedPrompt: autoRedacted.text,
      });

      if (review?.status === "fallback") {
        console.warn("Confidential Agent modal fallback:", review.error);
        const useAuto = window.confirm(
          "Secure review window could not be rendered. Use Confidential Agent auto-filter now?"
        );
        if (useAuto) {
          writePromptValue(el, autoRedacted.text);
          showUserAlert("Prompt auto-filtered. Review it, then click Send.");
          return;
        }
        const editedPrompt = window.prompt("Edit your prompt before sending:", prompt);
        if (editedPrompt !== null) {
          writePromptValue(el, editedPrompt);
          showUserAlert("Your edited prompt is ready. Click Send when ready.");
          return;
        }
        showUserAlert("Prompt not sent. You can edit and retry.");
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
          if (decision.action !== "BLOCK" && hasRedactedPlaceholders(manualPrompt)) {
            const continueSend = window.confirm(
              "This prompt is already redacted. Send it now?"
            );
            if (continueSend) {
              manualWarnBypassHash = hashString(manualPrompt);
              replaySubmission();
              return;
            }
          }
          showUserAlert(
            "Your prompt is unchanged and still flagged as sensitive. Edit it or choose auto-filter."
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
            const continueSend = window.confirm(
              "No extra redaction needed. The prompt already looks redacted. Send now?"
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
      platform: siteConfig.id,
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
      showUserAlert("Response anonymized due to sensitive content.");
      return;
    }

    if (decision.action === "WARN") {
      const keepVisible = window.confirm(
        "The AI response contains sensitive content. Keep it visible?"
      );
      if (!keepVisible) {
        maskResponseNode(node, "Response hidden after security warning.");
      }
    }
  }

  async function scanResponses() {
    const nodes = getResponseCandidates();
    await Promise.all(nodes.map((node) => analyzeResponseNode(node)));
  }

  function scheduleResponseScan() {
    if (extensionContextInvalid) return;
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
  scheduleResponseScan();
})();
