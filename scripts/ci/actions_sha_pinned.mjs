#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const targetPath = process.argv[2];
if (!targetPath) {
  console.error('Usage: actions_sha_pinned.mjs <workflow-path>');
  process.exit(1);
}

const resolvedPath = path.resolve(targetPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Missing workflow file: ${resolvedPath}`);
  process.exit(1);
}

const content = fs.readFileSync(resolvedPath, 'utf8');
const violations = [];
content.split('\n').forEach((line, index) => {
  const trim = line.trim();
  if (!trim.startsWith('uses:') || !trim.includes('@')) {
    return;
  }
  if (trim.includes('./') || trim.includes('.github/')) {
    return;
  }
  const ref = trim.split('@')[1].split(' ')[0].trim();
  if (!/^[a-f0-9]{40}$/.test(ref)) {
    violations.push({ line: index + 1, action: trim });
  }
});

if (violations.length) {
  console.error('❌ Action pinning violations detected:');
  for (const violation of violations) {
    console.error(`- [${path.basename(resolvedPath)}:${violation.line}] ${violation.action}`);
  }
  process.exit(1);
}

console.log('Action pinning check passed.');
