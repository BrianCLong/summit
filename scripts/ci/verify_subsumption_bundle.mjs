#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

function fail(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeysDeep(value[key]);
    }
    return out;
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function ensureString(value, label, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`Missing or invalid ${label}.`);
  }
}

function ensureArray(value, label, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`Missing or invalid ${label}.`);
  }
}

const manifestPath = process.argv[2];
if (!manifestPath) {
  fail('Usage: node scripts/ci/verify_subsumption_bundle.mjs <manifest.yaml>');
}

if (!fs.existsSync(manifestPath)) {
  fail(`Missing manifest: ${manifestPath}`);
}

const manifestRaw = readText(manifestPath);
let manifest;
try {
  manifest = yaml.load(manifestRaw);
} catch (error) {
  fail(`Invalid YAML in ${manifestPath}: ${error.message}`);
}

const errors = [];
ensureString(manifest?.version?.toString?.(), 'manifest version', errors);
ensureString(manifest?.item?.slug, 'item.slug', errors);
ensureString(manifest?.item?.title, 'item.title', errors);
ensureString(manifest?.item?.type, 'item.type', errors);
ensureString(manifest?.claims?.registry, 'claims.registry', errors);
ensureArray(manifest?.docs, 'docs', errors);
ensureArray(manifest?.evidence_ids, 'evidence_ids', errors);

const root = path.resolve(path.dirname(manifestPath), '..', '..');
const claimsRegistry = manifest?.claims?.registry
  ? path.join(root, manifest.claims.registry)
  : null;
if (claimsRegistry && !fileExists(claimsRegistry)) {
  errors.push(`Missing claims registry: ${claimsRegistry}`);
}

const docs = Array.isArray(manifest?.docs) ? manifest.docs : [];
for (const docPath of docs) {
  const resolved = path.join(root, docPath);
  if (!fileExists(resolved)) {
    errors.push(`Missing doc: ${resolved}`);
  }
}

const bundleDir = path.dirname(manifestPath);
const denyFixture = path.join(bundleDir, 'fixtures', 'deny', 'README.md');
const allowFixture = path.join(bundleDir, 'fixtures', 'allow', 'README.md');
if (!fileExists(denyFixture)) {
  errors.push(`Missing deny-by-default fixture: ${denyFixture}`);
}
if (!fileExists(allowFixture)) {
  errors.push(`Missing allow fixture: ${allowFixture}`);
}

const slug = manifest?.item?.slug;
const evidenceIndexPath = path.join(root, 'evidence', 'index.json');
let evidenceIndex = null;
if (slug === 'branch-protection-as-code') {
  if (fileExists(evidenceIndexPath)) {
    evidenceIndex = JSON.parse(readText(evidenceIndexPath));
  } else {
    errors.push(`Missing evidence index: ${evidenceIndexPath}`);
  }
}

if (slug === 'branch-protection-as-code' && evidenceIndex?.evidence) {
  for (const evidenceId of manifest.evidence_ids) {
    const entry = evidenceIndex.evidence[evidenceId];
    if (!entry) {
      errors.push(`Evidence ID missing in index: ${evidenceId}`);
      continue;
    }
    for (const filePath of entry.files || []) {
      const resolved = path.join(root, filePath);
      if (!fileExists(resolved)) {
        errors.push(`Evidence file missing: ${resolved}`);
      }
    }
  }
}

if (slug === 'branch-protection-as-code') {
  const evidenceDir = path.join(root, 'evidence', 'bpac', 'EVD-BPAC-GOV-003');
  const report = {
    evidence_id: 'EVD-BPAC-GOV-003',
    summary: errors.length > 0 ? 'Subsumption bundle verification failed.' : 'Subsumption bundle verified.',
    claims: ['SUMMIT_ORIGINAL'],
    decisions: [errors.length > 0 ? 'deny-by-default' : 'allow'],
    details: {
      manifest_path: manifestPath,
      docs_count: docs.length,
      evidence_ids_count: Array.isArray(manifest?.evidence_ids) ? manifest.evidence_ids.length : 0,
      errors
    }
  };
  const metrics = {
    evidence_id: 'EVD-BPAC-GOV-003',
    metrics: {
      docs_count: docs.length,
      evidence_ids_count: Array.isArray(manifest?.evidence_ids) ? manifest.evidence_ids.length : 0,
      error_count: errors.length
    }
  };
  const stamp = {
    evidence_id: 'EVD-BPAC-GOV-003',
    tool: 'verify_subsumption_bundle',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };

  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'report.json'), stableJson(report));
  fs.writeFileSync(path.join(evidenceDir, 'metrics.json'), stableJson(metrics));
  fs.writeFileSync(path.join(evidenceDir, 'stamp.json'), stableJson(stamp));
}

if (errors.length > 0) {
  fail(errors.join('\n'));
}

console.log('OK: subsumption bundle verification passed.');
