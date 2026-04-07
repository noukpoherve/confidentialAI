import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

let Site;

beforeAll(() => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(path.join(__dirname, "siteConfigs.js"), "utf8");
  const sandbox = { window: {}, URL };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  Site = sandbox.window.ConfidentialAgentSiteConfigs;
});

describe("siteConfigs user-site parsing", () => {
  it("parses domain-only input", () => {
    const parsed = Site.parseUserSiteInput("example.com");
    expect(parsed.ok).toBe(true);
    expect(parsed.host).toBe("example.com");
    expect(parsed.pathPrefix).toBeNull();
  });

  it("parses full URL input with normalized path prefix", () => {
    const parsed = Site.parseUserSiteInput("https://example.com/a/b/");
    expect(parsed.ok).toBe(true);
    expect(parsed.host).toBe("example.com");
    expect(parsed.pathPrefix).toBe("/a/b");
  });
});

describe("siteConfigs resolution", () => {
  it("resolves built-in config by host", () => {
    const cfg = Site.resolveCurrentSiteConfig(
      { hostname: "chatgpt.com", pathname: "/", href: "https://chatgpt.com/" },
      {}
    );
    expect(cfg).toBeTruthy();
    expect(cfg.id).toBe("chatgpt");
    expect(cfg.features).toContain("textAnalysis");
    expect(cfg.features).toContain("imageModeration");
  });

  it("resolves user-added scoped rule before host-level fallback", () => {
    const cfg = Site.resolveCurrentSiteConfig(
      { hostname: "example.com", pathname: "/org/repo/pull/8", href: "https://example.com/org/repo/pull/8" },
      {
        userAddedPlatforms: [
          {
            id: "u1",
            label: "Scoped",
            domain: "example.com",
            pathPrefix: "/org/repo",
            features: ["textAnalysis"],
          },
        ],
      }
    );
    expect(cfg).toBeTruthy();
    expect(cfg.id).toBe("user:u1");
    expect(cfg.features).toEqual(["textAnalysis"]);
  });
});
