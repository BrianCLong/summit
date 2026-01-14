#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const SCHEMA_VERSION = '1.0.0';

function getSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function collectFiles(rootDir, currentDir, fileDetails, relativePaths) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(rootDir, entryPath, fileDetails, relativePaths);
      continue;
    }

    if (entry.isFile()) {
      const stat = await fs.stat(entryPath);
      const content = await fs.readFile(entryPath);
      const relativePath = path.relative(rootDir, entryPath);
      fileDetails.push({
        path: path.join(rootDir, relativePath),
        bytes: stat.size,
        sha256: getSha256(content),
      });
      relativePaths.push(relativePath);
    }
  }
}

async function buildBundleIndex(dir) {
  const fileDetails = [];
  const relativePaths = [];
  await collectFiles(dir, dir, fileDetails, relativePaths);

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
    releaseArtifactsInventory: 'release-artifacts/inventory.json',
    releaseArtifactsChecksums: 'release-artifacts/SHA256SUMS',
  };

  for (const [key, file] of Object.entries(pointerCandidates)) {
    if (relativePaths.includes(file)) {
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
