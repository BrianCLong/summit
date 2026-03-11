#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function runGit(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (allowFailure) {
      return '';
    }
    const stderr = error?.stderr?.toString?.() ?? '';
    throw new Error(`git ${args.join(' ')} failed: ${stderr || error.message}`);
  }
}

function classifyRef(baseRef, branchRef) {
  const mergeBase = runGit(['merge-base', baseRef, branchRef], { allowFailure: true });
  const lane = mergeBase ? 'A_OR_B' : 'CANDIDATE_UNRELATED';

  const lfsPointers = runGit(['ls-tree', '-r', branchRef], { allowFailure: true })
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t')[1])
    .filter((path) => path && !path.endsWith('.md'))
    .slice(0, 200);

  let lfsSignals = 0;
  for (const path of lfsPointers) {
    const blob = runGit(['show', `${branchRef}:${path}`], { allowFailure: true });
    if (blob.startsWith('version https://git-lfs.github.com/spec/v1')) {
      lfsSignals += 1;
    }
  }

  if (!mergeBase && lfsSignals > 0) {
    return 'C';
  }
  if (!mergeBase) {
    return 'A';
  }
  if (lfsSignals > 0) {
    return 'B';
  }
  return 'A';
}

function parseArgs(argv) {
  const args = { base: 'origin/main', input: '', output: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--base') {
      args.base = argv[i + 1];
      i += 1;
    } else if (current === '--input') {
      args.input = argv[i + 1];
      i += 1;
    } else if (current === '--output') {
      args.output = argv[i + 1];
      i += 1;
    } else if (current === '--help') {
      console.log('Usage: node scripts/pr-backlog-audit.mjs --input <refs.txt> [--output report.json] [--base origin/main]');
      process.exit(0);
    }
  }

  if (!args.input) {
    throw new Error('Missing required --input argument.');
  }

  return args;
}

function main() {
  const { base, input, output } = parseArgs(process.argv.slice(2));
  const refs = readFileSync(resolve(input), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const rows = refs.map((ref) => ({ ref, lane: classifyRef(base, ref) }));
  const summary = rows.reduce(
    (acc, row) => {
      acc[row.lane] = (acc[row.lane] ?? 0) + 1;
      return acc;
    },
    { A: 0, B: 0, C: 0 },
  );

  const report = {
    generated_at: new Date().toISOString(),
    base_ref: base,
    total_refs: rows.length,
    summary,
    rows,
  };

  const reportText = JSON.stringify(report, null, 2);
  if (output) {
    writeFileSync(resolve(output), `${reportText}\n`);
    console.log(`Wrote ${output}`);
  } else {
    console.log(reportText);
  }
}

main();
