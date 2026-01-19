#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function compareStringsCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].replace(/^--/, '')] = args[i + 1];
  return out;
}

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * Minimal Evidence Map parser:
 * Supports a strict subset of YAML:
 * - `evidence:` section with list items containing `id: <VALUE>`
 * - optional `patterns:` section with list items that are scalar strings (e.g., `- EV-VERIFY-*`)
 * Ignores comments (# ...) and blank lines.
 *
 * This is intentionally conservative to avoid pulling in deps.
 */
function parseEvidenceMapYml(text) {
  const lines = text.split(/\r?\n/);

  let section = null; // 'evidence' | 'patterns' | null
  const ids = [];
  const patterns = [];

  for (let raw of lines) {
    // Strip comments
    const hash = raw.indexOf('#');
    if (hash >= 0) raw = raw.slice(0, hash);
    const line = raw.trim();
    if (!line) continue;

    if (line === 'evidence:') {
      section = 'evidence';
      continue;
    }
    if (line === 'patterns:') {
      section = 'patterns';
      continue;
    }

    // patterns: list scalar "- VALUE"
    if (section === 'patterns') {
      const m = line.match(/^-+\s*(.+)$/);
      if (m) {
        let val = m[1].trim();
        // Strip quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        patterns.push(val);
      }
      continue;
    }

    // evidence: list objects "- id: VALUE" or "- something" then "id: VALUE"
    if (section === 'evidence') {
      // Common compact form: "- id: EV-...."
      let m = line.match(/^-+\s*id:\s*(.+)$/i);
      if (m) {
        let val = m[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        ids.push(val);
        continue;
      }
      // Expanded form:
      // - name: ...
      //   id: EV-...
      m = line.match(/^id:\s*(.+)$/i);
      if (m) {
        let val = m[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        ids.push(val);
        continue;
      }
    }
  }

  return { ids, patterns };
}

function globToRegex(glob) {
  // Only support '*' wildcard. Escape regex metacharacters.
  const esc = glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const re = '^' + esc.replace(/\*/g, '.*') + '$';
  return new RegExp(re);
}

function isCoveredByPatterns(evidenceId, patterns) {
  for (const p of patterns) {
    const re = globToRegex(p);
    if (re.test(evidenceId)) return p;
  }
  return null;
}

const args = parseArgs();
const manifestPath = args.manifest || 'evidence/ga-evidence-manifest.json';
const evidenceMapPath = args['evidence-map'] || args.evidenceMap || 'docs/governance/evidence-map.yml';

if (!fileExists(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath}`);
  process.exit(1);
}
if (!fileExists(evidenceMapPath)) {
  console.error(`Missing evidence map: ${evidenceMapPath}`);
  process.exit(1);
}

const manifest = readJson(manifestPath);
const manifestIds = []
  .concat((manifest.subjects || []).map((x) => x.evidenceId))
  .concat((manifest.evidence || []).map((x) => x.evidenceId))
  .filter(Boolean)
  .sort(compareStringsCodepoint);

// Parse evidence map
const mapText = fs.readFileSync(evidenceMapPath, 'utf8');
const parsed = parseEvidenceMapYml(mapText);

const mapIds = (parsed.ids || []).filter(Boolean).sort(compareStringsCodepoint);
const mapPatterns = (parsed.patterns || []).filter(Boolean).sort(compareStringsCodepoint);

// Duplicate guards
function findDupes(arr) {
  const d = [];
  let prev = null;
  for (const x of arr) {
    if (x === prev) d.push(x);
    prev = x;
  }
  return d;
}

const dupesMapIds = findDupes(mapIds);
const dupesManifestIds = findDupes(manifestIds);

let failures = 0;

if (dupesMapIds.length) {
  console.error('DUPLICATE IDs IN EVIDENCE MAP:');
  for (const d of dupesMapIds) console.error(`  ${d}`);
  failures += dupesMapIds.length;
}
if (dupesManifestIds.length) {
  console.error('DUPLICATE IDs IN MANIFEST:');
  for (const d of dupesManifestIds) console.error(`  ${d}`);
  failures += dupesManifestIds.length;
}

// Coverage check
const mapIdSet = new Set(mapIds);
const uncovered = [];

for (const id of manifestIds) {
  if (mapIdSet.has(id)) continue;
  const covered = isCoveredByPatterns(id, mapPatterns);
  if (!covered) uncovered.push(id);
}

// Optional hygiene: warn about unused exact IDs (not failure)
const manifestIdSet = new Set(manifestIds);
const unused = [];
for (const id of mapIds) {
  if (!manifestIdSet.has(id)) unused.push(id);
}

if (uncovered.length) {
  console.error('UNREGISTERED EVIDENCE IDS (manifest not covered by evidence map ids or patterns):');
  for (const id of uncovered.sort(compareStringsCodepoint)) console.error(`  ${id}`);
  failures += uncovered.length;
}

if (unused.length) {
  console.log('NOTE: Unused exact IDs in evidence map (not failing):');
  for (const id of unused.slice().sort(compareStringsCodepoint)) console.log(`  ${id}`);
}

if (failures > 0) {
  console.error(`GA manifest validation FAILED: ${failures} issue(s)`);
  process.exit(1);
}

console.log('GA manifest validation PASSED');
