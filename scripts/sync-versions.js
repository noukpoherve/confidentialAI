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

// ── Node packages ──────────────────────────────────────────────────────────
const packageFiles = [
  "apps/admin-dashboard/package.json",
  "apps/browser-extension/package.json",
  "packages/shared-types/package.json",
];

for (const file of packageFiles) {
  const fullPath = path.join(root, file);
  const pkg = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  pkg.version = version;
  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  bumped ${file}  →  ${version}`);
}

// ── Python package (pyproject.toml) ───────────────────────────────────────
const pyprojectPath = path.join(root, "services/security-api/pyproject.toml");
let pyproject = fs.readFileSync(pyprojectPath, "utf8");
pyproject = pyproject.replace(/^version = ".*"$/m, `version = "${version}"`);
fs.writeFileSync(pyprojectPath, pyproject);
console.log(`  bumped services/security-api/pyproject.toml  →  ${version}`);

console.log(`\nAll packages synced to v${version}`);
