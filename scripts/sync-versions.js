#!/usr/bin/env node
/**
 * Syncs the version from root package.json to all other version files.
 * Called automatically by release-it via the after:bump hook.
 *
 * Usage: node scripts/sync-versions.js <version>
 */

const fs   = require("fs");
const path = require("path");

const version = process.argv[2];
if (!version) {
  console.error("Usage: sync-versions.js <version>");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");

function readFile(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: expected file not found: ${relPath}`);
    process.exit(1);
  }
  return { fullPath, content: fs.readFileSync(fullPath, "utf8") };
}

// ── Node packages ──────────────────────────────────────────────────────────
const packageFiles = [
  "apps/admin-dashboard/package.json",
  "apps/browser-extension/package.json",
  "packages/shared-types/package.json",
];

for (const file of packageFiles) {
  const { fullPath, content } = readFile(file);
  const pkg = JSON.parse(content);
  pkg.version = version;
  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  bumped ${file}  →  ${version}`);
}

// ── Python package (pyproject.toml) ───────────────────────────────────────
const pyprojectRel = "services/security-api/pyproject.toml";
const { fullPath: pyprojectPath, content: pyprojectRaw } = readFile(pyprojectRel);
const pyproject = pyprojectRaw.replace(/^version = ".*"$/m, `version = "${version}"`);
fs.writeFileSync(pyprojectPath, pyproject);
console.log(`  bumped ${pyprojectRel}  →  ${version}`);

// ── Browser extension manifest (manifest_version 3) ───────────────────────
// Chrome/Firefox require a plain X.Y.Z integer-only version string.
const manifestRel = "apps/browser-extension/manifest.json";
const { fullPath: manifestPath, content: manifestRaw } = readFile(manifestRel);
const manifest = JSON.parse(manifestRaw);
manifest.version = version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`  bumped ${manifestRel}  →  ${version}`);

console.log(`\nAll packages synced to v${version}`);
