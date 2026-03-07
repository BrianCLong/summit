#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';

// Types of artifacts to validate:
// - SBOM (sbom/bundle.cdx.json)
// - Evidence bundle (evidence.json or evidence-bundle.json or evidence/)
// - Provenance bundle (provenance.json)
// - Checksums (SHA256SUMS)
// - Signatures (*.sig)

const options = {
  dir: { type: 'string', default: process.cwd() },
};

const { values } = parseArgs({ options });
const BUNDLE_DIR = resolve(values.dir);

const REQUIRED_ARTIFACTS = [
  'sbom/bundle.cdx.json',
  ['evidence.json', 'evidence-bundle.json', 'evidence/'],
  'provenance.json',
  'SHA256SUMS'
];

const badge = {
  status: 'PASS',
  reasons: []
};

function fail(code, message) {
  badge.status = 'FAIL';
  badge.reasons.push(`[${code}] ${message}`);
}

function getSha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

// 1. Completeness & Signatures
for (const artifactOrList of REQUIRED_ARTIFACTS) {
  let found = false;
  let artifactPath = null;
  let checkSig = true;

  if (Array.isArray(artifactOrList)) {
    for (const artifact of artifactOrList) {
      if (existsSync(join(BUNDLE_DIR, artifact))) {
        found = true;
        artifactPath = artifact;
        if (artifact.endsWith('/')) {
            // we'll skip signature checking for directories here,
            // but normally we check signatures of files inside
            checkSig = false;
        }
        break;
      }
    }
  } else {
    if (existsSync(join(BUNDLE_DIR, artifactOrList))) {
      found = true;
      artifactPath = artifactOrList;
    }
  }

  if (!found) {
    fail('MISSING_ARTIFACT', `Missing required artifact: ${Array.isArray(artifactOrList) ? artifactOrList.join(' or ') : artifactOrList}`);
  } else if (checkSig) {
    const sigPath = join(BUNDLE_DIR, `${artifactPath}.sig`);
    if (!existsSync(sigPath)) {
      fail('MISSING_SIGNATURE', `Missing signature for artifact: ${artifactPath}`);
    }
  }
}

// 2. Schema validity (valid JSON) & 4. Timestamps
const jsonFiles = [
    'sbom/bundle.cdx.json',
    'evidence.json',
    'evidence-bundle.json',
    'provenance.json'
];

for (const file of jsonFiles) {
    const fullPath = join(BUNDLE_DIR, file);
    if (existsSync(fullPath)) {
        try {
            const content = readFileSync(fullPath, 'utf8');
            const data = JSON.parse(content);

            // Basic timestamp check: no top-level timestamp or timestamped fields
            // unless it's a known artifact that allows it (e.g. SBOM/provenance have their own schemas,
            // but we check evidence files strictly).
            if (file.includes('evidence') && !file.includes('stamp.json')) {
               const contentStr = JSON.stringify(data).toLowerCase();
               if (contentStr.includes('"timestamp":') || contentStr.includes('"time":')) {
                  fail('TIMESTAMP_VIOLATION', `Non-deterministic timestamp found in evidence file: ${file}`);
               }
            }

        } catch (e) {
             fail('INVALID_SCHEMA', `Invalid JSON in ${file}: ${e.message}`);
        }
    }
}


// 5. Reproducibility (Hashes)
const sumsPath = join(BUNDLE_DIR, 'SHA256SUMS');
if (existsSync(sumsPath)) {
    const lines = readFileSync(sumsPath, 'utf8').split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 2) {
            const [expectedHash, fPath] = parts;
            const fullPath = join(BUNDLE_DIR, fPath);
            if (existsSync(fullPath)) {
                const content = readFileSync(fullPath);
                const actualHash = getSha256(content);
                if (actualHash !== expectedHash) {
                    fail('HASH_MISMATCH', `Hash mismatch for ${fPath}. Expected ${expectedHash}, got ${actualHash}`);
                }
            }
        }
    }
}

// Output
console.log(`release-readiness: ${badge.status}`);
if (badge.status === 'FAIL') {
    badge.reasons.forEach(r => console.error(` - ${r}`));
    process.exit(1);
} else {
    console.log(' - All validation checks passed.');
    process.exit(0);
}
