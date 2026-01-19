#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function listFilesRecursive(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      results = results.concat(listFilesRecursive(p));
    } else {
      results.push(p);
    }
  }
  return results;
}

function compareStringsCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '').replace(/-([a-z])/g, g => g[1].toUpperCase());
    out[key] = args[i + 1];
  }
  return out;
}

const { verifyEvidence, sbom, out } = parseArgs();
if (!verifyEvidence || !sbom || !out) {
  console.error('Usage: generate_provenance_bundle.mjs --verify-evidence DIR --sbom FILE --out FILE');
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
      path: path.relative(verifyEvidence, f),
      sha256: sha256File(f),
    });
  }
}

verifyArtifacts.sort((a, b) =>
  compareStringsCodepoint(
    `${a.lane}:${a.path}`,
    `${b.lane}:${b.path}`
  )
);

const bundle = {
  schemaVersion: '1.0',
  verifyArtifacts,
  sbom: {
    path: path.basename(sbom),
    sha256: sha256File(sbom),
  },
};

const json = JSON.stringify(bundle, Object.keys(bundle).sort(compareStringsCodepoint), 2) + '\n';
fs.writeFileSync(out, json, 'utf8');
