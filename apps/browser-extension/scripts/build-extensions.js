#!/usr/bin/env node
/**
 * build-extensions.js
 *
 * Generates browser-specific extension packages.
 *
 * Usage:
 *   node scripts/build-extensions.js [--target chrome,edge,opera,firefox,safari] [--skip-css]
 *
 * Output (apps/browser-extension/dist/):
 *   confidential-agent-chrome-v0.1.1.zip
 *   confidential-agent-edge-v0.1.1.zip
 *   confidential-agent-opera-v0.1.1.zip
 *   confidential-agent-firefox-v0.1.1.zip
 *   confidential-agent-safari-v0.1.1/      ← folder, see Safari note below
 *
 * Safari note:
 *   Safari Web Extensions require an Xcode wrapper. After this script runs,
 *   convert the generated folder with:
 *     xcrun safari-web-extension-converter dist/confidential-agent-safari-v<version>
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ── Parse CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const _targetIdx = args.indexOf('--target');
const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1]
               ?? (_targetIdx !== -1 ? args[_targetIdx + 1] : undefined);
const skipCss   = args.includes('--skip-css');

const ALL_TARGETS = ['chrome', 'edge', 'opera', 'firefox', 'safari'];
const targets = targetArg
  ? targetArg.split(',').map(t => t.trim().toLowerCase())
  : ALL_TARGETS;

const invalid = targets.filter(t => !ALL_TARGETS.includes(t));
if (invalid.length) {
  console.error(`Unknown target(s): ${invalid.join(', ')}`);
  console.error(`Valid: ${ALL_TARGETS.join(', ')}`);
  process.exit(1);
}

// ── Load base manifest ────────────────────────────────────────────────────────

const baseManifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')
);
const VERSION = baseManifest.version;

// ── Files included in every build ─────────────────────────────────────────────
// Directories are copied recursively; the src/ dir excludes test/input files.

const INCLUDE_FILES = [
  'popup.html',
  'options.html',
  'tailwind.output.css',
];
const INCLUDE_DIRS = [
  '_locales',
  'icons',
];
// Files inside src/ to exclude (test artefacts, CSS source)
const SRC_EXCLUDE = ['.test.', '.spec.', 'input.css', 'vitest.'];

// ── Manifest builders ─────────────────────────────────────────────────────────

function chromeLike(base) {
  return JSON.parse(JSON.stringify(base));
}

function firefoxManifest(base) {
  const m = JSON.parse(JSON.stringify(base));

  // ── MV2 ───────────────────────────────────────────────────────────────────
  m.manifest_version = 2;

  // Required gecko ID for Firefox store submission
  m.browser_specific_settings = {
    gecko: {
      id: 'guardrail@confidentialagent.com',
      strict_min_version: '68.0',
    },
  };

  // MV2: action → browser_action
  if (m.action) {
    m.browser_action = { ...m.action };
    delete m.action;
  }

  // MV2: background.service_worker → background.scripts[]
  // (drop "type": "module" — MV2 background scripts don't use it)
  if (m.background?.service_worker) {
    m.background = { scripts: [m.background.service_worker] };
  }

  // MV2: host_permissions → merged into permissions
  //      "management" is not available in Firefox MV2 — remove it
  //      (options.js already handles its absence gracefully)
  const hostPerms = Array.isArray(m.host_permissions) ? m.host_permissions : [];
  const basePerms = (m.permissions || []).filter(p => p !== 'management');
  m.permissions = [...basePerms, ...hostPerms];
  delete m.host_permissions;

  // MV2: optional_host_permissions → optional_permissions
  if (m.optional_host_permissions) {
    m.optional_permissions = m.optional_host_permissions;
    delete m.optional_host_permissions;
  }

  // MV2: options_page → options_ui (opens in a full tab, required by Firefox)
  if (m.options_page) {
    m.options_ui = { page: m.options_page, open_in_tab: true };
    delete m.options_page;
  }

  return m;
}

function safariManifest(base) {
  // Safari MV3 — mostly identical to Chrome.
  // xcrun safari-web-extension-converter will wrap this into an Xcode project.
  return JSON.parse(JSON.stringify(base));
}

// ── Target definitions ────────────────────────────────────────────────────────

const TARGET_DEFS = {
  chrome:  { label: 'Chrome',  zip: true,  manifest: chromeLike  },
  edge:    { label: 'Edge',    zip: true,  manifest: chromeLike  },
  opera:   { label: 'Opera',   zip: true,  manifest: chromeLike  },
  firefox: { label: 'Firefox', zip: true,  manifest: firefoxManifest },
  safari:  { label: 'Safari',  zip: false, manifest: safariManifest  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg)  { process.stdout.write(`  ${msg}\n`); }
function ok(msg)   { process.stdout.write(`  ✓ ${msg}\n`); }
function warn(msg) { process.stdout.write(`  ⚠ ${msg}\n`); }

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Copy a file, creating parent dirs as needed. */
function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Recursively copy a directory, with optional filename filter. */
function copyDir(srcDir, destDir, filter = () => true) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath  = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, filter);
    } else if (filter(entry.name)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Stage all extension files into a temp directory. */
function stageFiles(stagingDir, manifestObj) {
  fs.mkdirSync(stagingDir, { recursive: true });

  // manifest.json — browser-specific version
  fs.writeFileSync(
    path.join(stagingDir, 'manifest.json'),
    JSON.stringify(manifestObj, null, 2) + '\n',
    'utf8'
  );

  // Flat files
  for (const file of INCLUDE_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      copyFile(src, path.join(stagingDir, file));
    } else {
      warn(`${file} not found — skipping`);
    }
  }

  // Directories
  for (const dir of INCLUDE_DIRS) {
    copyDir(path.join(ROOT, dir), path.join(stagingDir, dir));
  }

  // src/ — exclude test/build artefacts
  copyDir(
    path.join(ROOT, 'src'),
    path.join(stagingDir, 'src'),
    name => !SRC_EXCLUDE.some(pat => name.includes(pat))
  );
}

/** Create a ZIP from a staged directory. Returns the zip path. */
function zipStaging(stagingDir, zipPath) {
  rimraf(zipPath);
  // Run zip from inside the staging dir so paths inside the archive are relative
  execSync(`zip -r "${zipPath}" .`, { cwd: stagingDir, stdio: 'pipe' });
  return zipPath;
}

/** Human-readable file size. */
function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Build CSS if needed ───────────────────────────────────────────────────────

function ensureCss() {
  const cssOut = path.join(ROOT, 'tailwind.output.css');
  if (skipCss) {
    if (!fs.existsSync(cssOut)) {
      console.error('tailwind.output.css not found. Run without --skip-css first.');
      process.exit(1);
    }
    warn('--skip-css: reusing existing tailwind.output.css');
    return;
  }
  log('Building Tailwind CSS…');
  execSync('npm run build:css', { cwd: ROOT, stdio: 'pipe' });
  ok('CSS built');
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log(`\nConfidential Agent — Extension builder  v${VERSION}`);
  console.log(`Targets: ${targets.join(', ')}\n`);

  fs.mkdirSync(DIST, { recursive: true });
  ensureCss();
  console.log('');

  const results = [];

  for (const target of targets) {
    const def = TARGET_DEFS[target];
    console.log(`── ${def.label}`);

    const name      = `confidential-agent-${target}-v${VERSION}`;
    const stagingDir = path.join(DIST, `.staging-${target}`);

    try {
      rimraf(stagingDir);

      log('Staging files…');
      stageFiles(stagingDir, def.manifest(baseManifest));

      if (def.zip) {
        const zipPath = path.join(DIST, `${name}.zip`);
        log('Zipping…');
        zipStaging(stagingDir, zipPath);
        rimraf(stagingDir);
        const size = humanSize(fs.statSync(zipPath).size);
        ok(`${name}.zip  (${size})`);
        results.push({ browser: def.label, file: path.relative(path.join(ROOT, '..'), zipPath), size });
      } else {
        // Safari: keep the folder unzipped, ready for xcrun
        const outDir = path.join(DIST, name);
        rimraf(outDir);
        fs.renameSync(stagingDir, outDir);
        ok(`${name}/  (folder — ready for xcrun)`);
        results.push({ browser: def.label, file: path.relative(path.join(ROOT, '..'), outDir) + '/', size: '—' });
      }
    } catch (err) {
      rimraf(stagingDir);
      console.error(`  ✗ ${def.label} failed: ${err.message}`);
      results.push({ browser: def.label, file: 'FAILED', size: '' });
    }

    console.log('');
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('── Summary ──────────────────────────────');
  const colW = Math.max(...results.map(r => r.browser.length)) + 2;
  for (const r of results) {
    const browser = r.browser.padEnd(colW);
    const size = r.size ? `  (${r.size})` : '';
    console.log(`  ${browser}→  ${r.file}${size}`);
  }

  if (targets.includes('safari')) {
    console.log(`
── Safari next step ──────────────────────
  xcrun safari-web-extension-converter \\
    apps/browser-extension/dist/confidential-agent-safari-v${VERSION}
  Then open the generated Xcode project and build.
`);
  }

  console.log('Done.\n');
}

main();
