#!/usr/bin/env node
/**
 * hash-manifest.js
 * Usage: node tools/hash-manifest.js [--bump=<patch|minor|major>]
 *
 * - Updates SHA256 hashes for all files already in manifest.json
 * - Adds any new source files found on disk that aren't listed yet
 * - Flags manifest entries whose files have been deleted
 * - Bumps manifest version per the explicit --bump flag
 * - Writes manifest.json in place when --bump is provided
 *
 * Without --bump, the script runs in dry-run mode: prints what hashes would
 * change without writing or bumping. This enforces deliberate version bumps
 * per the PATCH/MINOR/MAJOR rules in jmt-addons-workflow.md.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// Source file extensions that belong in the manifest
const INCLUDE_EXTS = new Set(['.h', '.cpp', '.c', '.cc', '.ino']);

// Top-level dirs/files to never scan (relative to repo root)
const EXCLUDE_DIRS  = new Set(['tools', '.git', 'node_modules', 'local']);
const EXCLUDE_FILES = new Set(['manifest.json']);

// ── Helpers ────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST  = path.join(REPO_ROOT, 'manifest.json');

function parseArgs() {
  const args = process.argv.slice(2);
  let bumpType = null;
  for (const arg of args) {
    if (arg.startsWith('--bump=')) {
      bumpType = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  if (bumpType && !['patch', 'minor', 'major'].includes(bumpType)) {
    console.error(`ERROR: Invalid --bump value: ${bumpType}`);
    console.error('Must be one of: patch, minor, major');
    process.exit(1);
  }
  return { bumpType };
}

function printUsage() {
  console.log(`Usage: node tools/hash-manifest.js [--bump=<patch|minor|major>]

Updates SHA256 hashes in manifest.json. Without --bump, runs in dry-run mode
(prints changes, does not write). With --bump, updates hashes AND bumps the
version per the chosen level.

See jmt-addons-workflow.md for the PATCH/MINOR/MAJOR decision rules.`);
}

function sha256(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function scanRepo(dir, base) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!base && EXCLUDE_DIRS.has(entry.name)) continue;
      results.push(...scanRepo(path.join(dir, entry.name), rel));
    } else if (INCLUDE_EXTS.has(path.extname(entry.name).toLowerCase())) {
      if (!EXCLUDE_FILES.has(entry.name)) results.push(rel);
    }
  }
  return results;
}

function bumpVersion(ver, type) {
  const [maj, min, pat] = String(ver || '1.0.0').split('.').map(Number);
  if (type === 'major') return `${maj + 1}.0.0`;
  if (type === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

// ── Main ───────────────────────────────────────────────

const { bumpType } = parseArgs();
const dryRun = !bumpType;

if (!fs.existsSync(MANIFEST)) {
  console.error('manifest.json not found at', MANIFEST);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (!Array.isArray(manifest.files)) manifest.files = [];

const onDisk     = new Set(scanRepo(REPO_ROOT, ''));
const inManifest = new Map(manifest.files.map(f => [f.path, f]));

let added = 0, updated = 0, missing = 0;
const pendingHashUpdates = new Map();
const pendingAdds = [];

// Check existing entries
for (const entry of manifest.files) {
  const abs = path.join(REPO_ROOT, entry.path);
  if (!fs.existsSync(abs)) {
    console.warn(`  MISSING  ${entry.path}  (in manifest but not on disk)`);
    missing++;
    continue;
  }
  const hash = sha256(abs);
  if (entry.sha256 !== hash) {
    console.log(`  UPDATED  ${entry.path}`);
    pendingHashUpdates.set(entry.path, hash);
    updated++;
  } else {
    console.log(`  OK       ${entry.path}`);
  }
}

// Check new files found on disk
for (const rel of [...onDisk].sort()) {
  if (inManifest.has(rel)) continue;
  const hash = sha256(path.join(REPO_ROOT, rel));
  pendingAdds.push({ path: rel, sha256: hash });
  console.log(`  ADDED    ${rel}  (would be added)`);
  added++;
}

if (dryRun) {
  console.log(`\nDry run. Found ${added} new, ${updated} changed, ${missing} missing.`);
  console.log('To apply: re-run with --bump=<patch|minor|major>');
  console.log('See jmt-addons-workflow.md for bump-level rules.');
  process.exit(0);
}

// Apply pending hash and file changes
for (const [pathKey, newHash] of pendingHashUpdates) {
  const entry = manifest.files.find(f => f.path === pathKey);
  if (entry) entry.sha256 = newHash;
}
for (const addEntry of pendingAdds) {
  manifest.files.push(addEntry);
}

// Sort manifest files by path for consistency
manifest.files.sort((a, b) => a.path.localeCompare(b.path));

// Bump version
const oldVersion = manifest.version;
manifest.version = bumpVersion(oldVersion, bumpType);

// Write
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const parts = [];
if (added)   parts.push(`${added} added`);
if (updated) parts.push(`${updated} updated`);
const changedPart = parts.length ? ` (${parts.join(', ')})` : '';
console.log(`\nv${oldVersion} -> v${manifest.version}  [${bumpType.toUpperCase()}]${changedPart}`);
console.log('Wrote manifest.json');

if (bumpType === 'major') {
  console.log('\n[!] MAJOR bump applied.');
  console.log('    Studio will surface a backwards-compat warning to users.');
  console.log('    Confirm a coordinated Studio update is shipping or imminent.');
  console.log('    Set manifest.minStudioVersion to the Studio version that supports the change.');
}

if (missing) {
  console.warn(`\n[!] ${missing} manifest entr${missing !== 1 ? 'ies' : 'y'} point to missing files; remove them manually if intentional.`);
}
