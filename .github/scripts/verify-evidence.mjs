import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'evidence', 'index.json');
const TIMESTAMP_REGEX =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;

async function main() {
  const index = await loadEvidenceIndex(INDEX_PATH);
  const missingFiles = [];
  const timestampViolations = [];

  for (const item of index.items) {
    const fileEntries = Object.entries(item.files ?? {});
    for (const [, filePath] of fileEntries) {
      const absolutePath = path.join(ROOT, filePath);
      const exists = await fileExists(absolutePath);
      if (!exists) {
        missingFiles.push(`${item.evidence_id}: ${filePath}`);
        continue;
      }

      if (!absolutePath.endsWith('stamp.json')) {
        const content = await fs.readFile(absolutePath, 'utf8');
        if (TIMESTAMP_REGEX.test(content)) {
          timestampViolations.push(filePath);
        }
      }
    }
  }

  const changedFiles = getChangedFiles();
  const lockfileChanged = changedFiles.includes('pnpm-lock.yaml');
  const depsDeltaPresent = await hasDepsDeltaDocs();

  const errors = [];
  if (missingFiles.length > 0) {
    errors.push(
      `Missing evidence files:\n${missingFiles.map((file) => `- ${file}`).join('\n')}`,
    );
  }

  if (timestampViolations.length > 0) {
    errors.push(
      `Timestamp content detected outside stamp.json:\n${timestampViolations
        .map((file) => `- ${file}`)
        .join('\n')}`,
    );
  }

  if (lockfileChanged && !depsDeltaPresent) {
    errors.push(
      'pnpm-lock.yaml changed without docs/security/deps-delta/*.md evidence.',
    );
  }

  if (errors.length > 0) {
    console.error('Evidence verification failed:\n');
    console.error(errors.join('\n\n'));
    process.exit(1);
  }

  console.log('Evidence verification passed.');
}

async function loadEvidenceIndex(indexPath) {
  const raw = await fs.readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('evidence/index.json must include an items array.');
  }
  return parsed;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function getChangedFiles() {
  const baseRef = process.env.GITHUB_BASE_REF;
  const diffRange = baseRef ? `origin/${baseRef}...HEAD` : 'HEAD~1...HEAD';
  const commands = [
    `git diff --name-only ${diffRange}`,
    'git diff --name-only HEAD~1...HEAD',
    'git diff --name-only',
  ];

  for (const cmd of commands) {
    try {
      const output = execSync(cmd, { encoding: 'utf8' }).trim();
      return output ? output.split('\n') : [];
    } catch (error) {
      continue;
    }
  }

  return [];
}

async function hasDepsDeltaDocs() {
  const depsDir = path.join(ROOT, 'docs', 'security', 'deps-delta');
  try {
    const entries = await fs.readdir(depsDir);
    return entries.some((entry) => entry.endsWith('.md'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

main();
