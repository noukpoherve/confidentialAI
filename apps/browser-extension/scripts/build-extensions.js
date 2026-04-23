#!/usr/bin/env node
/**
 * Build script for the browser extension.
 *
 * Usage:
 *   node scripts/build-extensions.js --browser chrome
 *   node scripts/build-extensions.js --browser firefox
 *   node scripts/build-extensions.js --browser edge
 *   node scripts/build-extensions.js --browser all        (builds all browsers)
 *
 * Flags:
 *   --env production    Injects __CONFIDENTIAL_AGENT_BUILD__ = "production"
 *                       so the extension uses the Koyeb API URL instead of localhost.
 *   --env development   (default) Uses localhost:8080
 *
 * Examples:
 *   node scripts/build-extensions.js --browser chrome --env production
 *   node scripts/build-extensions.js --browser all --env production
 */

import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Parse CLI arguments ───────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const ENV = getArg("--env") ?? "development";
const BROWSER_ARG = getArg("--browser") ?? "chrome";
const IS_PRODUCTION = ENV === "production";

const ALL_BROWSERS = ["chrome", "firefox", "edge", "opera", "safari"];
const BROWSERS = BROWSER_ARG === "all" ? ALL_BROWSERS : [BROWSER_ARG];

if (!["production", "development"].includes(ENV)) {
  console.error(`Unknown --env value: "${ENV}". Use "production" or "development".`);
  process.exit(1);
}

console.log(`\nBuild config:`);
console.log(`  env      : ${ENV}`);
console.log(`  browsers : ${BROWSERS.join(", ")}`);
console.log(`  api      : ${IS_PRODUCTION ? "https://confidentialai.koyeb.app" : "http://localhost:8080"}`);
console.log("");

// ── Files to copy from source ─────────────────────────────────────────────────
// Add any new HTML, asset or source file here.

const STATIC_FILES = [
  "manifest.json",
  "options.html",
  "popup.html",
  "tailwind.output.css",
];

const STATIC_DIRS = [
  "icons",
  "_locales",
  "src",
];

// ── Per-browser manifest patches ─────────────────────────────────────────────
// Some browsers need small adjustments to the base manifest.json.

const MANIFEST_PATCHES = {
  firefox: (manifest) => ({
    ...manifest,
    // Firefox requires a unique extension ID for AMO (addons.mozilla.org) submission
    browser_specific_settings: {
      gecko: {
        id: "confidential-agent@tnbsoftlab.com",
        strict_min_version: "109.0",
      },
    },
  }),
  // Chrome, Edge, Opera, Safari: no patch needed
  chrome: (m) => m,
  edge:   (m) => m,
  opera:  (m) => m,
  safari: (m) => m,
};

// ── Build function ────────────────────────────────────────────────────────────

function build(browser) {
  const outDir = join(ROOT, "dist", browser);

  // 1. Clean output directory
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  console.log(`[${browser}] Cleaned ${outDir}`);

  // 2. Copy static files
  for (const file of STATIC_FILES) {
    if (file === "manifest.json") continue; // handled separately below
    cpSync(join(ROOT, file), join(outDir, file), { errorOnExist: false });
  }

  // 3. Copy static directories
  for (const dir of STATIC_DIRS) {
    if (dir === "src") continue; // handled separately below
    cpSync(join(ROOT, dir), join(outDir, dir), { recursive: true });
  }

  // 4. Copy src/ files, then inject the build environment into background.js
  const srcOut = join(outDir, "src");
  mkdirSync(srcOut, { recursive: true });
  cpSync(join(ROOT, "src"), srcOut, { recursive: true });

  // Inject __CONFIDENTIAL_AGENT_BUILD__ at the very top of background.js.
  // The existing code already reads this global to decide which API URL to use:
  //   if (override === "production" || override === "development") { ... }
  const bgPath = join(srcOut, "background.js");
  const bgOriginal = readFileSync(bgPath, "utf8");
  const injected = `globalThis.__CONFIDENTIAL_AGENT_BUILD__ = "${ENV}";\n\n${bgOriginal}`;
  writeFileSync(bgPath, injected, "utf8");
  console.log(`[${browser}] Injected __CONFIDENTIAL_AGENT_BUILD__ = "${ENV}" into background.js`);

  // 5. Write patched manifest.json
  const baseManifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
  const patch = MANIFEST_PATCHES[browser] ?? ((m) => m);
  const finalManifest = patch(baseManifest);

  // In development builds: keep localhost host permissions.
  // In production builds: remove localhost (cleaner, smaller attack surface).
  if (IS_PRODUCTION) {
    finalManifest.host_permissions = finalManifest.host_permissions.filter(
      (h) => !h.includes("localhost") && !h.includes("127.0.0.1")
    );
  }

  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify(finalManifest, null, 2),
    "utf8"
  );
  console.log(`[${browser}] manifest.json written`);
  console.log(`[${browser}] Build complete → ${outDir}\n`);
}

// ── Run ───────────────────────────────────────────────────────────────────────

for (const browser of BROWSERS) {
  build(browser);
}

console.log("Done.");
