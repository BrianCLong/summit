#!/usr/bin/env node
'use strict';

const path = require('path');
const { scanDependencyDrift, renderMarkdownReport } = require('./lib/report');
const { writeFileSync } = require('fs');

function parseArgs(argv) {
  const args = { out: null, root: process.cwd() };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      args.out = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--root') {
      args.root = argv[i + 1];
      i += 1;
      continue;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.out) {
    console.error('Usage: node index.js --out <report.md> [--root <dir>]');
    process.exitCode = 1;
    return;
  }

  const report = await scanDependencyDrift({ rootDir: args.root });
  const markdown = renderMarkdownReport(report);
  const outPath = path.resolve(args.out);
  writeFileSync(outPath, markdown, 'utf8');
  console.log(`Wrote report to ${outPath}`);
}

main().catch((error) => {
  console.error('deps-drift failed:', error);
  process.exitCode = 1;
});
