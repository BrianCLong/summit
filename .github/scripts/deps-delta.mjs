#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

function unique(values) {
  return [...new Set(values)];
}

function parseLockDiff(diffText) {
  const added = [];
  const removed = [];
  const lines = diffText.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('+') && !line.startsWith('-')) {
      continue;
    }
    if (line.startsWith('+++') || line.startsWith('---')) {
      continue;
    }
    const match = line.match(/^[+-]\s{2}\/(@?[^@/\s]+(?:\/[^@\s]+)?)@/);
    if (!match) {
      continue;
    }
    const dep = match[1];
    if (line.startsWith('+')) {
      added.push(dep);
    }
    if (line.startsWith('-')) {
      removed.push(dep);
    }
  }
  return { added: unique(added), removed: unique(removed) };
}

function getLockDiff() {
  try {
    return execSync('git diff --unified=0 -- pnpm-lock.yaml', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? '';
    return stdout;
  }
}

function loadPolicy(policyPath) {
  const raw = fs.readFileSync(policyPath, 'utf8');
  return JSON.parse(raw);
}

function main() {
  const root = process.cwd();
  const policyPath = path.join(root, '.github/policies/platform-first-deps.json');
  const outDir = path.join(root, 'artifacts');
  const outPath = path.join(outDir, 'deps-delta.json');

  const diffText = getLockDiff();
  const delta = parseLockDiff(diffText);
  const policy = loadPolicy(policyPath);
  const allowed = new Set(policy.allowed_new_dependencies || []);
  const unacknowledged = delta.added.filter((dep) => !allowed.has(dep));

  const report = {
    generated_at: new Date().toISOString(),
    source: 'pnpm-lock.yaml',
    added: delta.added,
    removed: delta.removed,
    unacknowledged
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  if (unacknowledged.length > 0) {
    console.error(`Unacknowledged dependency additions: ${unacknowledged.join(', ')}`);
    process.exit(2);
  }

  console.log(`Dependency delta report written: ${path.relative(root, outPath)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseLockDiff };
