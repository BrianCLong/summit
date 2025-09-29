#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getChangedFiles() {
  try {
    return execSync('git diff --name-only origin/main...HEAD', {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    try {
      return execSync('git diff --name-only --staged', {
        stdio: ['pipe', 'pipe', 'pipe'],
      })
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}

function patternToRegex(pattern) {
  let p = pattern.startsWith('/') ? pattern.slice(1) : pattern;
  p = p.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  p = p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
  return new RegExp('^' + p);
}

function loadRules() {
  const content = fs
    .readFileSync(path.join(__dirname, '..', 'CODEOWNERS'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'));

  return content.map((line) => {
    const [pattern, ...owners] = line.trim().split(/\s+/);
    return { pattern, owners };
  });
}

function ownersForFile(file, rules) {
  let owners = [];
  for (const rule of rules) {
    const regex = patternToRegex(rule.pattern);
    if (regex.test(file)) {
      owners = rule.owners;
    }
  }
  return owners.filter((o) => o.startsWith('@team-'));
}

const files = getChangedFiles();
const rules = loadRules();
const teams = new Set();

for (const file of files) {
  const owners = ownersForFile(file, rules);
  owners.forEach((o) => teams.add(o));
}

if (teams.size > 1) {
  console.error(
    `PR touches multiple team-owned areas: ${Array.from(teams).join(', ')}`,
  );
  process.exit(1);
}

console.log('Team ownership check passed.');

