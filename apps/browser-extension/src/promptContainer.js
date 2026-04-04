/**
 * Resolve the semantic container C for a prompt element P:
 * first ancestor within maxAncestorSteps that is a <form>, has role=dialog|main,
 * or contains exactly one visible editable text field; otherwise parent(P).
 *
 * Exposed as globalThis.ConfidentialAgentPromptContainer for the content script;
 * also exported for unit tests (Node).
 */
(function initPromptContainer(global) {
  "use strict";

  function elementWindow(el) {
    return el && el.ownerDocument && el.ownerDocument.defaultView;
  }

  /** Works across realms (nested jsdom, iframes) — avoids global HTMLElement. */
  function isHtmlElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const win = elementWindow(el);
    if (win && win.HTMLElement) return el instanceof win.HTMLElement;
    return typeof el.getAttribute === "function";
  }

  function isPromptLikeEditable(el) {
    if (!isHtmlElement(el)) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA") return !el.readOnly;
    if (tag === "INPUT") {
      const t = (el.type || "text").toLowerCase();
      if (!["text", "search", "email", "url", ""].includes(t)) return false;
      return !el.readOnly;
    }
    if (el.getAttribute("contenteditable") === "true") return true;
    if (tag === "RICH-TEXTAREA") return true;
    if (el.getAttribute("role") === "textbox") return true;
    return false;
  }

  function isVisibleElement(el) {
    if (!isHtmlElement(el)) return false;
    const win = elementWindow(el);
    if (!win || !win.getComputedStyle) {
      const r = el.getBoundingClientRect?.();
      return !!(r && r.width >= 4 && r.height >= 4);
    }
    const style = win.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (el.hasAttribute("hidden")) return false;
    const r = el.getBoundingClientRect();
    if (r.width >= 4 && r.height >= 4) return true;
    // jsdom / no layout engine: rects are often 0×0; still treat editable fields as visible
    // when not explicitly hidden (matches real focusable composer behavior).
    const tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" || el.getAttribute("contenteditable") === "true") {
      return true;
    }
    return false;
  }

  /**
   * Collect prompt-like editable elements under root (not crossing shadow roots).
   */
  function queryEditableCandidates(root) {
    const out = [];
    if (!root || typeof root.querySelectorAll !== "function") return out;
    root.querySelectorAll(
      'textarea, input, [contenteditable="true"], rich-textarea, [role="textbox"]'
    ).forEach((el) => {
      out.push(el);
    });
    return out;
  }

  function countVisibleEditableTextFields(root) {
    if (!isHtmlElement(root)) return 0;
    let n = 0;
    for (const el of queryEditableCandidates(root)) {
      if (isPromptLikeEditable(el) && isVisibleElement(el)) n += 1;
    }
    return n;
  }

  function hasDialogOrMainRole(el) {
    if (!isHtmlElement(el)) return false;
    const r = (el.getAttribute("role") || "").toLowerCase();
    return r === "dialog" || r === "main";
  }

  function matchesContainerRule(node) {
    if (!isHtmlElement(node)) return false;
    if (node.tagName === "FORM") return true;
    if (hasDialogOrMainRole(node)) return true;
    if (countVisibleEditableTextFields(node) === 1) return true;
    return false;
  }

  /**
   * @param {HTMLElement} P - prompt field (textarea, input, contenteditable, …)
   * @param {object} [options]
   * @param {number} [options.maxAncestorSteps=5] - max ancestors to walk from P (not including P)
   * @returns {HTMLElement|null}
   */
  function findPromptContainer(P, options) {
    const maxAncestorSteps =
      options && typeof options.maxAncestorSteps === "number"
        ? options.maxAncestorSteps
        : 5;

    if (!isHtmlElement(P)) return null;

    let node = P.parentElement;
    let k = 1;
    const doc = P.ownerDocument;
    const body = doc && doc.body;

    while (node && node !== body && k <= maxAncestorSteps) {
      if (matchesContainerRule(node)) return node;
      node = node.parentElement;
      k += 1;
    }

    const parent = P.parentElement;
    return parent || null;
  }

  const api = {
    findPromptContainer,
    countVisibleEditableTextFields,
    matchesContainerRule,
    isPromptLikeEditable,
    isVisibleElement,
  };

  global.ConfidentialAgentPromptContainer = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
