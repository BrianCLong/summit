#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const SCHEMA_VERSION = '1.0.0';

function getSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function buildBundleIndex(dir) {
  const files = await fs.readdir(dir);
  const fileDetails = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat.isFile()) {
      const content = await fs.readFile(filePath);
      fileDetails.push({
        path: path.join(dir, file),
        bytes: stat.size,
        sha256: getSha256(content),
      });
    }
  }

  const tag = process.env.GITHUB_REF_NAME || 'local';
  const channel = tag.includes('-rc') ? 'rc' : 'stable';

  const pointers = {};
  const pointerCandidates = {
    status: 'release-status.json',
    manifest: 'release-manifest.json',
    notes: 'release-notes.md',
    sbom: 'sbom.spdx.json',
    provenance: 'provenance.json',
    checksums: 'SHA256SUMS',
    compatibility: 'compatibility.json',
  };

  for (const [key, file] of Object.entries(pointerCandidates)) {
    if (files.includes(file)) {
      pointers[key] = path.join(dir, file);
    }
  }

  const index = {
    schemaVersion: SCHEMA_VERSION,
    tag,
    channel,
    generatedAt: new Date().toISOString(),
    pointers,
    files: fileDetails,
  };

  const outputPath = path.join(dir, 'bundle-index.json');
  await fs.writeFile(outputPath, JSON.stringify(index, null, 2) + '\n');
  console.log(`Bundle index written to ${outputPath}`);
}

async function main() {
  const [dir] = process.argv.slice(2);

  if (!dir) {
    console.error('Usage: ./build-bundle-index.mjs <directory>');
    process.exit(1);
  }

  await buildBundleIndex(dir);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
