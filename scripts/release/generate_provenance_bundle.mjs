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

function listFilesRecursive(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) results = results.concat(listFilesRecursive(p));
    else results.push(p);
  }
  return results;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].replace(/^--/, '')] = args[i + 1];
  return out;
}

const args = parseArgs();
const verifyEvidence = args['verify-evidence'] || args.verifyEvidence;
const sbom = args.sbom;
const rebuildManifest = args['rebuild-manifest'] || args.rebuildManifest; // optional
const outFile = args.out;

if (!verifyEvidence || !sbom || !outFile) {
  console.error('Usage: generate_provenance_bundle.mjs --verify-evidence DIR --sbom FILE [--rebuild-manifest FILE] --out FILE');
  process.exit(1);
}

const lanes = fs.readdirSync(verifyEvidence).sort(compareStringsCodepoint);

const verifyArtifacts = [];
for (const lane of lanes) {
  const laneDir = path.join(verifyEvidence, lane);
  if (!fs.statSync(laneDir).isDirectory()) continue;

  const files = listFilesRecursive(laneDir).sort(compareStringsCodepoint);
  for (const f of files) {
    verifyArtifacts.push({
      lane,
      path: path.relative(verifyEvidence, f).split(path.sep).join('/'),
      sha256: sha256File(f),
    });
  }
}

verifyArtifacts.sort((a, b) =>
  compareStringsCodepoint(`${a.lane}:${a.path}`, `${b.lane}:${b.path}`)
);

const bundle = {
  schemaVersion: '1.0',
  verifyArtifacts,
  sbom: {
    path: path.basename(sbom),
    sha256: sha256File(sbom),
  },
};

if (rebuildManifest) {
  bundle.rebuild = {
    path: path.basename(rebuildManifest),
    sha256: sha256File(rebuildManifest),
  };
}

fs.writeFileSync(outFile, stableStringify(bundle), 'utf8');
