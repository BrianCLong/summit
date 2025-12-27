'use strict';

const { readdir } = require('fs/promises');
const path = require('path');

const LOCKFILE_NAMES = new Set([
  'pnpm-lock.yaml',
  'package-lock.json',
]);

function isRequirementsFile(file) {
  if (!file.startsWith('requirements')) {
    return false;
  }
  return file.endsWith('.txt') || file.endsWith('.in');
}

function shouldSkipDir(name) {
  return (
    name === 'node_modules' ||
    name === '.git' ||
    name === 'dist' ||
    name === 'build' ||
    name === 'coverage'
  );
}

async function walkLockfiles(rootDir) {
  const results = [];
  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) {
          continue;
        }
        await walk(path.join(currentDir, entry.name));
        continue;
      }
      if (LOCKFILE_NAMES.has(entry.name) || isRequirementsFile(entry.name)) {
        results.push(path.join(currentDir, entry.name));
      }
    }
  }
  await walk(rootDir);
  return results;
}

module.exports = {
  walkLockfiles,
  isRequirementsFile,
};
