#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MARKER_PATTERN = /^(<<<<<<< .+|=======|>>>>>>> .+)$/m;
const EXCLUDED_EXTENSIONS = new Set(['.md', '.txt']);
const EXCLUDED_FILENAMES = new Set(['pnpm-lock.yaml', 'go.sum']);

function getChangedFiles(baseSha, headSha) {
  const stdout = execFileSync('git', ['diff', '--name-only', `${baseSha}..${headSha}`], {
    encoding: 'utf8',
  });
  return stdout
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => {
      if (EXCLUDED_FILENAMES.has(file)) return false;
      const dotIndex = file.lastIndexOf('.');
      if (dotIndex === -1) return true;
      return !EXCLUDED_EXTENSIONS.has(file.slice(dotIndex));
    });
}

function hasConflictMarkers(filePath) {
  const content = readFileSync(filePath, 'utf8');
  return MARKER_PATTERN.test(content);
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;

  if (!baseSha || !headSha) {
    console.error('BASE_SHA and HEAD_SHA must be provided.');
    process.exit(2);
  }

  const changedFiles = getChangedFiles(baseSha, headSha);
  const offendingFiles = changedFiles.filter(hasConflictMarkers);

  if (offendingFiles.length > 0) {
    console.error('Merge conflict markers detected in changed files:');
    for (const file of offendingFiles) {
      console.error(` - ${file}`);
    }
    process.exit(1);
  }

  console.log('No merge conflict markers detected in changed files.');
}

main();
