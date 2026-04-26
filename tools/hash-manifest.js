#!/usr/bin/env node
/**
 * hash-manifest.js
 * Run from the repo root: node tools/hash-manifest.js
 *
 * - Updates SHA256 hashes for all files already in manifest.json
 * - Adds any new source files found on disk that aren't listed yet
 * - Flags manifest entries whose files have been deleted
 * - Bumps manifest version (minor if files added, patch if only hashes changed)
 * - Writes manifest.json in place when anything changes
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// Source file extensions that belong in the manifest
const INCLUDE_EXTS = new Set(['.h', '.cpp', '.c', '.cc', '.ino']);

// Top-level dirs/files to never scan (relative to repo root)
const EXCLUDE_DIRS  = new Set(['tools', '.git', 'node_modules']);
const EXCLUDE_FILES = new Set(['manifest.json']);

// ── Helpers ────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST  = path.join(REPO_ROOT, 'manifest.json');

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
  if (type === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

// ── Main ───────────────────────────────────────────────

if (!fs.existsSync(MANIFEST)) {
  console.error('manifest.json not found at', MANIFEST);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (!Array.isArray(manifest.files)) manifest.files = [];

const onDisk     = new Set(scanRepo(REPO_ROOT, ''));
const inManifest = new Map(manifest.files.map(f => [f.path, f]));

let added = 0, updated = 0, missing = 0;

// Update / flag existing entries
for (const entry of manifest.files) {
  const abs = path.join(REPO_ROOT, entry.path);
  if (!fs.existsSync(abs)) {
    console.warn(`  MISSING  ${entry.path}  ← in manifest but not on disk`);
    missing++;
    continue;
  }
  const hash = sha256(abs);
  if (entry.sha256 !== hash) {
    console.log(`  UPDATED  ${entry.path}`);
    entry.sha256 = hash;
    updated++;
  } else {
    console.log(`  OK       ${entry.path}`);
  }
}

// Add new files found on disk
for (const rel of [...onDisk].sort()) {
  if (inManifest.has(rel)) continue;
  const hash = sha256(path.join(REPO_ROOT, rel));
  manifest.files.push({ path: rel, sha256: hash });
  console.log(`  ADDED    ${rel}`);
  added++;
}

// Sort manifest files by path for consistency
manifest.files.sort((a, b) => a.path.localeCompare(b.path));

// Write back if anything changed
if (added || updated) {
  const oldVersion = manifest.version;
  manifest.version = bumpVersion(oldVersion, added ? 'minor' : 'patch');

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const parts = [];
  if (added)   parts.push(`${added} added`);
  if (updated) parts.push(`${updated} updated`);
  console.log(`\nv${oldVersion} → v${manifest.version}  (${parts.join(', ')})`);
  console.log('Wrote manifest.json');
} else {
  console.log(`\nv${manifest.version} — all hashes up to date, manifest.json unchanged.`);
}

if (missing) {
  console.warn(`\n⚠  ${missing} manifest entr${missing !== 1 ? 'ies' : 'y'} point to missing files — remove them manually if intentional.`);
}
