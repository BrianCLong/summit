#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Configuration
const TAG = process.env.TAG || process.argv[2];
const PREV_TAG_ARG = process.env.PREV_TAG || process.argv[3];
const MAX_COMMITS = process.env.MAX_COMMITS || 500;
const OUTPUT_DIR = resolve('dist/release');
const OUTPUT_FILE = join(OUTPUT_DIR, 'release-notes.md');

if (!TAG) {
  console.error('Error: TAG is required (via env TAG or first argument)');
  process.exit(1);
}

// Helpers
function runGit(command) {
  try {
    return execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch (error) {
    return null;
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getRepoUrl() {
  if (process.env.GITHUB_REPOSITORY) {
    return `https://github.com/${process.env.GITHUB_REPOSITORY}`;
  }
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    if (remoteUrl.startsWith('git@github.com:')) {
      return `https://github.com/${remoteUrl.replace('git@github.com:', '').replace('.git', '')}`;
    }
    if (remoteUrl.endsWith('.git')) {
      return remoteUrl.slice(0, -4);
    }
    return remoteUrl;
  } catch (e) {
    return '';
  }
}

const REPO_URL = getRepoUrl();

// 1. Determine Range
let prevTag = PREV_TAG_ARG;
if (!prevTag) {
  const tagCommit = runGit(`git rev-list -n 1 "${TAG}"`);
  if (tagCommit) {
    const prev = runGit(`git describe --abbrev=0 --tags --match "v*" "${TAG}^" 2>/dev/null`);
    if (prev) {
      prevTag = prev;
    }
  }
}

console.log(`Generating release notes for ${TAG}...`);
if (prevTag) {
  console.log(`Comparing against previous tag: ${prevTag}`);
} else {
  console.log(`No previous tag found. Listing last ${MAX_COMMITS} commits.`);
}

// 2. Extract Commits
let logCommand;
if (prevTag) {
  logCommand = `git log "${prevTag}..${TAG}" --pretty=format:"%H%n%s%n%b%n---COMMIT_DELIMITER---"`;
} else {
  logCommand = `git log "${TAG}" -n ${MAX_COMMITS} --pretty=format:"%H%n%s%n%b%n---COMMIT_DELIMITER---"`;
}

const rawLog = runGit(logCommand);
if (!rawLog) {
  console.error('Error: Failed to retrieve git log.');
  process.exit(1);
}

const commits = rawLog.split('\n---COMMIT_DELIMITER---\n').filter(c => c.trim()).map(raw => {
  const lines = raw.trim().split('\n');
  const hash = lines[0];
  const subject = lines[1];
  const body = lines.slice(2).join('\n');
  const shortHash = hash.substring(0, 7);
  return { hash, shortHash, subject, body };
});

// 3. Parse Conventional Commits
const TYPE_MAP = {
  feat: '✨ Features',
  fix: '🐛 Fixes',
  perf: '⚡ Performance',
  refactor: '🛠 Refactors',
  docs: '📚 Docs',
  test: '🧪 Tests',
  build: '🔧 Build / CI',
  ci: '🔧 Build / CI',
  chore: '🧹 Chores',
  revert: '↩️ Reverts'
};

const ORDER = [
  '🚨 Breaking Changes',
  '✨ Features',
  '🐛 Fixes',
  '⚡ Performance',
  '🛠 Refactors',
  '📚 Docs',
  '🧪 Tests',
  '🔧 Build / CI',
  '🧹 Chores',
  '↩️ Reverts',
  'Other'
];

const groups = {};
ORDER.forEach(g => groups[g] = []);

const ccRegex = /^([a-z]+)(?:\(([^)]+)\))?(!?):\s+(.+)$/;

commits.forEach(commit => {
  const { subject, body, shortHash } = commit;

  let isBreaking = false;
  let type = 'Other';
  let scope = null;
  let cleanSubject = subject;

  const match = subject.match(ccRegex);

  if (match) {
    const rawType = match[1];
    const rawScope = match[2];
    const breakingMark = match[3];
    const rawSubject = match[4];

    if (TYPE_MAP[rawType]) {
      type = TYPE_MAP[rawType];
    }

    scope = rawScope;
    cleanSubject = rawSubject;

    if (breakingMark === '!') {
      isBreaking = true;
    }
  }

  if (body.includes('BREAKING CHANGE:') || body.includes('BREAKING-CHANGE:')) {
    isBreaking = true;
  }

  const entry = {
    scope,
    subject: cleanSubject,
    hash: shortHash,
    rawSubject: subject
  };

  if (isBreaking) {
    groups['🚨 Breaking Changes'].push(entry);
  } else {
    groups[type].push(entry);
  }
});

// 4. Generate Markdown
const lines = [];
const date = new Date().toISOString().split('T')[0];

lines.push(`# Release Notes: ${TAG}`);
lines.push('');
lines.push(`> **Date:** ${date}`);
if (prevTag && REPO_URL) {
  lines.push(`> **Compare:** [${prevTag}...${TAG}](${REPO_URL}/compare/${prevTag}...${TAG})`);
} else if (prevTag) {
  lines.push(`> **Compare:** ${prevTag}...${TAG}`);
}
lines.push('');

lines.push(`**${commits.length} commits** included.`);
lines.push('');

ORDER.forEach(groupName => {
  const entries = groups[groupName];
  if (entries.length === 0) return;

  lines.push(`## ${groupName}`);
  lines.push('');

  entries.forEach(entry => {
    let line = '- ';
    if (entry.scope) {
      line += `**${entry.scope}:** `;
    }
    line += `${entry.subject} (${entry.hash})`;
    lines.push(line);
  });
  lines.push('');
});

const content = lines.join('\n');

// 5. Write Output
ensureDir(OUTPUT_DIR);
writeFileSync(OUTPUT_FILE, content);
console.log(`Release notes written to ${OUTPUT_FILE}`);
