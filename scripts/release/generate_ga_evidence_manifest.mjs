#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function compareStringsCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function stableClone(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stableClone);
  if (typeof value !== 'object') return value;

  const keys = Object.keys(value).sort(compareStringsCodepoint);
  const out = {};
  for (const k of keys) out[k] = stableClone(value[k]);
  return out;
}

function stableStringify(value) {
  return JSON.stringify(stableClone(value), null, 2) + '\n';
}

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].replace(/^--/, '')] = args[i + 1];
  return out;
}

function sanitizeToken(s) {
  return String(s)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function shortHash(sha256Hex) {
  return String(sha256Hex).slice(0, 12);
}

const args = parseArgs();
const evidenceDir = args['evidence-dir'] || args.evidenceDir || 'evidence';
const provenancePath = args.provenance || path.join(evidenceDir, 'provenance.json');
const outFile = args.out || path.join(evidenceDir, 'ga-evidence-manifest.json');

if (!fileExists(provenancePath)) {
  console.error(`Missing provenance file: ${provenancePath}`);
  process.exit(1);
}

const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
const verifyArtifacts = Array.isArray(provenance.verifyArtifacts) ? provenance.verifyArtifacts : [];

verifyArtifacts.sort((a, b) =>
  compareStringsCodepoint(`${a.lane}:${a.path}`, `${b.lane}:${b.path}`)
);

const subjects = [];
const subjectCandidates = [
  { name: 'provenance', rel: 'provenance.json' },
  { name: 'evidence-index', rel: 'evidence-index.json' },
  { name: 'sbom', rel: 'sbom.cdx.json' },
  { name: 'rebuild-manifest', rel: 'rebuild-manifest.json' },
];

for (const c of subjectCandidates) {
  const p = path.join(evidenceDir, c.rel);
  if (fileExists(p)) {
    const sha256 = sha256File(p);
    subjects.push({
      evidenceId: `EV-SUBJECT-${sanitizeToken(c.name)}-${shortHash(sha256)}`,
      kind: 'subject',
      name: c.name,
      path: c.rel,
      sha256,
    });
  }
}

subjects.sort((a, b) => compareStringsCodepoint(a.evidenceId, b.evidenceId));

const evidenceItems = [];

// Verify artifacts
for (const a of verifyArtifacts) {
  const lane = sanitizeToken(a.lane || 'unknown');
  const base = sanitizeToken(path.basename(a.path || 'artifact'));
  const id = `EV-VERIFY-${lane}-${base}-${shortHash(a.sha256)}`;

  evidenceItems.push({
    evidenceId: id,
    kind: 'verify-artifact',
    lane: a.lane,
    path: a.path,
    sha256: a.sha256,
  });
}

// Stable sort
evidenceItems.sort((x, y) => compareStringsCodepoint(x.evidenceId, y.evidenceId));

// Duplicate ID guard (should not happen, but enforce deterministically)
const seen = new Set();
let dupes = 0;
for (const e of evidenceItems.concat(subjects)) {
  if (seen.has(e.evidenceId)) {
    console.error(`DUPLICATE EVIDENCE ID: ${e.evidenceId}`);
    dupes++;
  }
  seen.add(e.evidenceId);
}
if (dupes > 0) process.exit(1);

const manifest = {
  schemaVersion: '1.0',
  contract: {
    evidenceIdRules: {
      verify: 'EV-VERIFY-<LANE>-<BASENAME>-<SHA256_12>',
      subject: 'EV-SUBJECT-<NAME>-<SHA256_12>',
    },
    determinism: [
      'No timestamps in outputs',
      'Codepoint sorting for all lists',
      'Stable JSON rendering with sorted keys',
    ],
  },
  totals: {
    subjects: subjects.length,
    verifyArtifacts: evidenceItems.length,
    all: subjects.length + evidenceItems.length,
  },
  subjects,
  evidence: evidenceItems,
};

fs.writeFileSync(outFile, stableStringify(manifest), 'utf8');
console.log(`Wrote ${outFile}`);
