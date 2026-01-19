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
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '').replace(/-([a-z])/g, g => g[1].toUpperCase());
    out[key] = args[i + 1];
  }
  return out;
}

const { bundle, verifyEvidence } = parseArgs();
if (!bundle || !verifyEvidence) {
  console.error('Usage: compare_artifact_hashes.mjs --bundle FILE --verify-evidence DIR');
  process.exit(1);
}

const provenance = JSON.parse(fs.readFileSync(bundle, 'utf8'));

let failures = 0;

for (const entry of provenance.verifyArtifacts) {
  const actualPath = path.join(verifyEvidence, entry.path);
  if (!fs.existsSync(actualPath)) {
    console.error(`MISSING: ${entry.path}`);
    failures++;
    continue;
  }
  const actualHash = sha256File(actualPath);
  if (actualHash !== entry.sha256) {
    console.error(`HASH MISMATCH: ${entry.path}`);
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
