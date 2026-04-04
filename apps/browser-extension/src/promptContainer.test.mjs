import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import pc from "./promptContainer.js";

const {
  findPromptContainer,
  countVisibleEditableTextFields,
  matchesContainerRule,
} = pc;

function dom(html) {
  return new JSDOM(html, {
    pretendToBeVisual: true,
    url: "https://example.test/page",
  });
}

/** Nested wrappers each with two visible textareas so single-field never matches until <form>. */
function deepTwoFieldForm(depth) {
  let inner = `<div id="L1"><textarea id="p"></textarea><textarea></textarea></div>`;
  for (let d = 2; d <= depth; d += 1) {
    inner = `<div id="L${d}"><textarea></textarea><textarea></textarea>${inner}</div>`;
  }
  return `<!DOCTYPE html><body><form id="far">${inner}</form></body>`;
}

describe("findPromptContainer", () => {
  it("chooses the enclosing <form> when it is the first matching ancestor", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <form id="f"><textarea id="p"></textarea></form>
    </body>`);
    const P = window.document.getElementById("p");
    expect(findPromptContainer(P).id).toBe("f");
  });

  it("prefers the closest single-field wrapper over a higher <form>", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <form id="f">
        <div id="box"><textarea id="p"></textarea></div>
      </form>
    </body>`);
    const P = window.document.getElementById("p");
    expect(findPromptContainer(P).id).toBe("box");
  });

  it("uses role=dialog when it matches before other rules in the ancestor chain", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <div id="dlg" role="dialog">
        <div class="inner">
          <textarea id="a"></textarea>
          <textarea id="b"></textarea>
        </div>
      </div>
    </body>`);
    const P = window.document.getElementById("a");
    expect(findPromptContainer(P).id).toBe("dlg");
  });

  it("uses <main> when it is the first matching ancestor (single-field rule)", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <main id="m"><textarea id="p"></textarea></main>
    </body>`);
    const P = window.document.getElementById("p");
    expect(findPromptContainer(P).id).toBe("m");
  });

  it("falls back to immediate parent when nothing matches within the horizon", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <div id="outer">
        <div id="d1"><div id="d2"><div id="d3"><div id="d4"><div id="d5"><div id="d6">
          <textarea id="t1"></textarea>
          <textarea id="t2"></textarea>
        </div></div></div></div></div></div>
      </div>
    </body>`);
    const P = window.document.getElementById("t1");
    const C = findPromptContainer(P, { maxAncestorSteps: 5 });
    expect(C.id).toBe("d6");
  });

  it("does not reach a distant <form> within 5 steps; reaches it with a larger horizon", () => {
    const { window } = dom(deepTwoFieldForm(6));
    const P = window.document.getElementById("p");
    expect(findPromptContainer(P, { maxAncestorSteps: 5 }).id).toBe("L1");
    expect(findPromptContainer(P, { maxAncestorSteps: 10 }).id).toBe("far");
  });

  it("returns parent of P when ancestors keep failing the rules within the horizon", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <div id="wrap">
        <textarea id="t1"></textarea>
        <textarea id="t2"></textarea>
      </div>
    </body>`);
    const P = window.document.getElementById("t1");
    const C = findPromptContainer(P, { maxAncestorSteps: 2 });
    expect(C.id).toBe("wrap");
  });

  it("counts only visible fields for the single-field rule", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <div id="box">
        <textarea id="p"></textarea>
        <textarea id="hidden" style="display:none"></textarea>
      </div>
    </body>`);
    const P = window.document.getElementById("p");
    expect(countVisibleEditableTextFields(window.document.getElementById("box"))).toBe(1);
    expect(findPromptContainer(P).id).toBe("box");
  });

  it("ignores hidden inputs for counting", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <form id="f">
        <input type="hidden" name="x" value="1" />
        <textarea id="p"></textarea>
      </form>
    </body>`);
    const P = window.document.getElementById("p");
    expect(countVisibleEditableTextFields(window.document.getElementById("f"))).toBe(1);
    expect(findPromptContainer(P).id).toBe("f");
  });

  it("treats contenteditable as a text field for counting", () => {
    const { window } = dom(`<!DOCTYPE html><body>
      <div id="box">
        <div id="ce" contenteditable="true"></div>
      </div>
    </body>`);
    const box = window.document.getElementById("box");
    expect(countVisibleEditableTextFields(box)).toBe(1);
    expect(matchesContainerRule(box)).toBe(true);
  });

  it("returns null for non-HTMLElement", () => {
    expect(findPromptContainer(null)).toBe(null);
  });
});

describe("matchesContainerRule", () => {
  it("is true for form element", () => {
    const { window } = dom("<!DOCTYPE html><body><form id='f'></form></body>");
    const f = window.document.getElementById("f");
    expect(matchesContainerRule(f)).toBe(true);
  });
});
