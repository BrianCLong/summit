import fs from 'node:fs/promises';
import path from 'node:path';
import { stableStringify } from './lib/cas.mjs';

const parseArgs = (argv) => {
  const args = {
    cas: 'artifacts/cas',
    manifests: [],
    manifestRoot: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cas') {
      args.cas = argv[i + 1];
      i += 1;
    } else if (arg === '--manifest') {
      args.manifests.push(argv[i + 1]);
      i += 1;
    } else if (arg === '--manifest-root') {
      args.manifestRoot = argv[i + 1];
      i += 1;
    }
  }

  return args;
};

const listFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const childFiles = await listFiles(resolved);
      files.push(...childFiles);
    } else if (entry.isFile()) {
      files.push(resolved);
    }
  }
  return files.sort();
};

const collectManifestPaths = async (manifestRoot) => {
  if (!manifestRoot) return [];
  const files = await listFiles(manifestRoot);
  return files.filter((file) => path.basename(file) === 'run-manifest.json');
};

const loadManifests = async (paths) => {
  const manifests = [];
  for (const manifestPath of paths) {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    manifests.push({ manifestPath, manifest: parsed });
  }
  return manifests;
};

const main = async () => {
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.error('CAS prune refused: running in CI.');
    process.exit(2);
  }

  if (process.env.ALLOW_CAS_PRUNE !== '1') {
    console.error('CAS prune refused: set ALLOW_CAS_PRUNE=1 to proceed.');
    process.exit(2);
  }

  const args = parseArgs(process.argv.slice(2));
  const manifestPaths = [
    ...args.manifests,
    ...(await collectManifestPaths(args.manifestRoot)),
  ];

  if (manifestPaths.length === 0) {
    console.error('CAS prune requires at least one manifest path.');
    process.exit(2);
  }

  const manifests = await loadManifests(manifestPaths);
  const referenced = new Set();

  for (const { manifest } of manifests) {
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    for (const entry of files) {
      if (entry?.cas) {
        referenced.add(path.join(args.cas, entry.cas));
      }
    }
  }

  const casDir = path.join(args.cas, 'sha256');
  const casFiles = await listFiles(casDir);
  const blobs = casFiles.filter((file) => file.endsWith('.blob'));

  let removed = 0;
  for (const blobPath of blobs) {
    if (!referenced.has(blobPath)) {
      const metaPath = blobPath.replace(/\.blob$/, '.meta.json');
      await fs.unlink(blobPath);
      removed += 1;
      try {
        await fs.unlink(metaPath);
      } catch (error) {
        // Ignore missing meta files.
      }
    }
  }

  const report = {
    schema_version: '1',
    cas_root: args.cas,
    manifests: manifestPaths,
    removed_blobs: removed,
    referenced_blobs: referenced.size,
  };

  await fs.writeFile(
    path.join(args.cas, 'cas-prune-report.json'),
    stableStringify(report),
  );

  console.log(`CAS prune complete. Removed ${removed} blobs.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
