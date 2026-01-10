#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (key.startsWith('--')) {
    const value = process.argv[i + 1];
    args.set(key, value);
    i += 1;
  }
}

const targetArg = args.get('--dir');
if (!targetArg || targetArg.startsWith('--')) {
  console.error('Usage: node scripts/release/generate_artifact_inventory.mjs --dir <artifact-dir> [--output <output-dir>]');
  process.exit(1);
}

const targetPath = resolve(targetArg);
const targetStat = statSync(targetPath);
const targetDir = targetStat.isDirectory() ? targetPath : dirname(targetPath);

const outputArg = args.get('--output');
const outputDir = resolve(outputArg || join(process.cwd(), 'artifacts', 'release-artifacts'));
if (outputDir === targetDir) {
  console.error('Output directory must not equal the target directory.');
  process.exit(1);
}

const outputInsideTarget = outputDir.startsWith(`${targetDir}${sep}`);
const outputRel = outputInsideTarget ? relative(targetDir, outputDir).replaceAll(sep, '/') : null;

const contentTypes = new Map([
  ['.json', 'application/json'],
  ['.md', 'text/markdown'],
  ['.txt', 'text/plain'],
  ['.yml', 'text/yaml'],
  ['.yaml', 'text/yaml'],
  ['.sh', 'text/x-shellscript'],
  ['.js', 'text/javascript'],
  ['.mjs', 'text/javascript'],
  ['.cjs', 'text/javascript'],
  ['.ts', 'text/typescript'],
  ['.tar.gz', 'application/gzip'],
  ['.tgz', 'application/gzip'],
  ['.zip', 'application/zip']
]);

function toPosixPath(pathValue) {
  return pathValue.split(sep).join('/');
}

function guessContentType(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.tar.gz')) {
    return contentTypes.get('.tar.gz');
  }
  const extIndex = lower.lastIndexOf('.');
  if (extIndex === -1) {
    return 'application/octet-stream';
  }
  const ext = lower.slice(extIndex);
  return contentTypes.get(ext) || 'application/octet-stream';
}

function listFiles(dirPath, collector) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (outputInsideTarget && entryPath.startsWith(`${outputDir}${sep}`)) {
      continue;
    }
    if (entry.isDirectory()) {
      listFiles(entryPath, collector);
    } else if (entry.isFile()) {
      collector.push(entryPath);
    }
  }
}

function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function getGitMetadata() {
  const fallback = {
    commit_sha: process.env.GITHUB_SHA || 'Deferred pending git metadata',
    ref: process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || 'Deferred pending git metadata'
  };

  let commitSha = fallback.commit_sha;
  let ref = fallback.ref;

  try {
    commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    commitSha = fallback.commit_sha;
  }

  try {
    ref = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    ref = fallback.ref;
  }

  return { commit_sha: commitSha, ref };
}

const files = [];
if (targetStat.isDirectory()) {
  listFiles(targetDir, files);
} else {
  files.push(targetPath);
}

const sortedFiles = files
  .map(filePath => {
    const relPath = toPosixPath(relative(targetDir, filePath));
    return { filePath, relPath };
  })
  .sort((a, b) => a.relPath.localeCompare(b.relPath));

const artifacts = sortedFiles.map(({ filePath, relPath }) => {
  const stats = statSync(filePath);
  return {
    path: relPath,
    size: stats.size,
    sha256: sha256File(filePath),
    content_type: guessContentType(relPath)
  };
});

const inventory = {
  schemaVersion: '1.0.0',
  source: {
    directory: toPosixPath(relative(process.cwd(), targetDir) || '.')
  },
  build: getGitMetadata(),
  artifacts
};

mkdirSync(outputDir, { recursive: true });

const inventoryPath = join(outputDir, 'inventory.json');
const sumsPath = join(outputDir, 'SHA256SUMS');

const inventoryPayload = `${JSON.stringify(inventory, null, 2)}\n`;
writeFileSync(inventoryPath, inventoryPayload);

const sumsPayload = artifacts
  .map(entry => `${entry.sha256}  ${entry.path}`)
  .join('\n');
writeFileSync(sumsPath, `${sumsPayload}\n`);

const summary = outputInsideTarget ? `${outputRel}` : toPosixPath(relative(process.cwd(), outputDir));
console.log(`Release artifact inventory written to ${summary}`);
