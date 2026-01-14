#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { casConstants } from './lib/cas.mjs';

const parseArgs = (argv) => {
  const config = {
    casRoot: path.join('artifacts', 'cas'),
    manifests: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cas') {
      config.casRoot = argv[++i];
    } else if (arg === '--manifest') {
      config.manifests.push(argv[++i]);
    }
  }

  return config;
};

const listCasBlobs = async (casRoot) => {
  const root = path.join(casRoot, casConstants.namespace);
  const blobs = [];

  const walk = async (dir) => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.blob')) {
        blobs.push(entryPath);
      }
    }
  };

  await walk(root);
  return blobs.sort();
};

const loadManifestDigests = async (manifestPath) => {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  return new Set((manifest.files || []).map((entry) => entry.sha256));
};

const main = async () => {
  if (process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true') {
    console.error('CAS prune refused: CI environment detected.');
    process.exit(2);
  }

  if (process.env.ALLOW_CAS_PRUNE !== '1') {
    console.error('CAS prune refused: set ALLOW_CAS_PRUNE=1 to proceed.');
    process.exit(2);
  }

  const { casRoot, manifests } = parseArgs(process.argv.slice(2));

  if (manifests.length === 0) {
    console.error('CAS prune refused: provide at least one --manifest path.');
    process.exit(2);
  }

  const keepDigests = new Set();
  for (const manifestPath of manifests) {
    const digests = await loadManifestDigests(manifestPath);
    digests.forEach((digest) => keepDigests.add(digest));
  }

  const blobs = await listCasBlobs(casRoot);
  let removed = 0;

  for (const blob of blobs) {
    const digest = path.basename(blob, '.blob');
    if (!keepDigests.has(digest)) {
      await fs.unlink(blob);
      const metaPath = `${blob}.meta.json`;
      await fs.unlink(metaPath).catch(() => {});
      removed += 1;
    }
  }

  console.log(`CAS prune complete. Removed ${removed} blobs.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
