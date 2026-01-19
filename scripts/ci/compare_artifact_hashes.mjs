#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].replace(/^--/, '')] = args[i + 1];
  return out;
}

const args = parseArgs();
const bundlePath = args.bundle;
const verifyEvidenceDir = args['verify-evidence'] || args.verifyEvidence;

if (!bundlePath || !verifyEvidenceDir) {
  console.error('Usage: compare_artifact_hashes.mjs --bundle FILE --verify-evidence DIR');
  process.exit(1);
}

const provenance = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

let failures = 0;

for (const entry of provenance.verifyArtifacts || []) {
  // Normalize to prevent traversal attempts
  const rel = (entry.path || '').replace(/\\/g, '/');
  if (rel.includes('..')) {
    console.error(`INVALID PATH (traversal): ${rel}`);
    failures++;
    continue;
  }

  const actualPath = path.join(verifyEvidenceDir, rel);
  if (!fs.existsSync(actualPath)) {
    console.error(`MISSING: ${rel}`);
    failures++;
    continue;
  }

  const actualHash = sha256File(actualPath);
  if (actualHash !== entry.sha256) {
    console.error(`HASH MISMATCH: ${rel}`);
    console.error(` expected ${entry.sha256}`);
    console.error(` actual   ${actualHash}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`Artifact verification failed: ${failures} error(s)`);
  process.exit(1);
}

console.log('Artifact hash verification PASSED');
