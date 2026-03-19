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

    const payload = {
      requestId: `req-${Date.now()}`,
      platform: siteConfig.id,
      prompt,
      userConsent: false,
      metadata: {
        pageUrl: window.location.href,
      },
    };

    const result = await chrome.runtime.sendMessage({
      type: "ANALYZE_PROMPT",
      payload,
    });

    if (!result?.ok) {
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

    if (decision.action === "BLOCK") {
      event.preventDefault();
      event.stopPropagation();
      showUserAlert("Prompt blocked: sensitive content detected.");
      return;
    }

    if (decision.action === "WARN") {
      const confirmed = window.confirm("This prompt contains sensitive data. Continue anyway?");
      if (!confirmed) {
        return;
      }
      // If the user confirms, redact locally to reduce risk.
      const redacted = redactorApi.applyLocalRedaction(prompt);
      writePromptValue(el, redacted.text);
      showUserAlert("Prompt anonymized. Review it, then click Send again.");
      return;
    }

    if (decision.action === "ANONYMIZE") {
      const redacted = redactorApi.applyLocalRedaction(prompt);
      writePromptValue(el, redacted.text);
      showUserAlert("Prompt anonymized. Review it, then click Send again.");
    }
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
})();
