#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DEFAULT_OUT_DIR = 'artifacts/release-artifacts';

const CONTENT_TYPES = new Map([
  ['.json', 'application/json'],
  ['.md', 'text/markdown'],
  ['.txt', 'text/plain'],
  ['.log', 'text/plain'],
  ['.sh', 'text/x-shellscript'],
  ['.yml', 'text/yaml'],
  ['.yaml', 'text/yaml'],
  ['.js', 'application/javascript'],
  ['.mjs', 'application/javascript'],
  ['.cjs', 'application/javascript'],
  ['.ts', 'text/typescript'],
  ['.tsx', 'text/tsx'],
  ['.zip', 'application/zip'],
  ['.tgz', 'application/gzip'],
  ['.gz', 'application/gzip'],
  ['.tar', 'application/x-tar'],
]);

const args = process.argv.slice(2);
let artifactDir = '';
let outDir = DEFAULT_OUT_DIR;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--dir') {
    artifactDir = args[i + 1] ?? '';
    i += 1;
    continue;
  }
  if (arg === '--out') {
    outDir = args[i + 1] ?? '';
    i += 1;
    continue;
  }
  if (arg === '--help') {
    console.log('Usage: generate_artifact_inventory.mjs --dir <artifact-dir> [--out <path>]');
    process.exit(0);
  }
  console.error(`Unknown argument: ${arg}`);
  process.exit(2);
}

if (!artifactDir) {
  console.error('Missing required argument: --dir <artifact-dir>');
  process.exit(2);
}

const resolveRepoPath = (...segments) => path.resolve(process.cwd(), ...segments);
const resolvedArtifactDir = resolveRepoPath(artifactDir);
const resolvedOutDir = resolveRepoPath(outDir);

const isWithin = (target, parent) => {
  const relative = path.relative(parent, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const toPosixPath = (value) => value.split(path.sep).join('/');

const getContentType = (relativePath) => {
  if (relativePath.endsWith('.tar.gz')) {
    return 'application/gzip';
  }
  const extension = path.extname(relativePath).toLowerCase();
  return CONTENT_TYPES.get(extension);
};

const readHash = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const listFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (isWithin(fullPath, resolvedOutDir)) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const gitValue = (argsList, fallback) => {
  try {
    const output = execFileSync('git', argsList, { encoding: 'utf8' }).trim();
    return output || fallback;
  } catch (error) {
    return fallback;
  }
};

const main = async () => {
  const artifactStats = await fs.stat(resolvedArtifactDir);
  if (!artifactStats.isDirectory()) {
    throw new Error(`Artifact directory is not a directory: ${resolvedArtifactDir}`);
  }
  await fs.mkdir(resolvedOutDir, { recursive: true });

  const filePaths = await listFiles(resolvedArtifactDir);
  const entries = [];

  for (const fullPath of filePaths) {
    const stat = await fs.stat(fullPath);
    const relativePath = toPosixPath(path.relative(resolvedArtifactDir, fullPath));
    const sha256 = await readHash(fullPath);
    const contentType = getContentType(relativePath);
    const entry = {
      path: relativePath,
      bytes: stat.size,
      sha256,
    };
    if (contentType) {
      entry.content_type = contentType;
    }
    entries.push(entry);
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  const inventory = {
    version: '1.0.0',
    build: {
      commit_sha:
        process.env.BUILD_COMMIT_SHA ||
        process.env.GIT_COMMIT ||
        gitValue(['rev-parse', 'HEAD'], 'unknown'),
      ref:
        process.env.BUILD_REF ||
        process.env.GIT_REF ||
        gitValue(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown'),
    },
    artifacts: entries,
  };

  const inventoryPath = path.join(resolvedOutDir, 'inventory.json');
  const sumsPath = path.join(resolvedOutDir, 'SHA256SUMS');

  await fs.writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');

  const sumsLines = entries.map((entry) => `${entry.sha256}  ${entry.path}`);
  await fs.writeFile(sumsPath, `${sumsLines.join('\n')}\n`, 'utf8');
};

main().catch((error) => {
  console.error(`Failed to generate artifact inventory: ${error.message}`);
  process.exit(1);
});
