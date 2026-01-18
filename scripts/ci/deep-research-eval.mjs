#!/usr/bin/env node
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { spawnSync } from 'child_process';

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
};

const args = parseArgs(process.argv.slice(2));
const mode = args.mode || process.env.DEEP_RESEARCH_EVAL_MODE || 'advisory';
const taskpack = args.taskpack || process.env.DEEP_RESEARCH_EVAL_TASKPACK ||
  'packages/deep-research-eval/fixtures/taskpack.sample.json';
const reports = args.reports || process.env.DEEP_RESEARCH_EVAL_REPORTS ||
  'packages/deep-research-eval/fixtures/reports.sample.json';
const outDir = args.out || process.env.DEEP_RESEARCH_EVAL_OUT ||
  'artifacts/deep-research-eval';
const runId = args['run-id'] || process.env.DEEP_RESEARCH_EVAL_RUN_ID || `ci-${mode}`;
const waiverPath = args.waiver || process.env.DEEP_RESEARCH_EVAL_WAIVER;

const distEntry = 'packages/deep-research-eval/dist/index.js';
if (!existsSync(distEntry)) {
  const build = spawnSync('pnpm', ['--filter', '@summit/deep-research-eval', 'build'], {
    stdio: 'inherit',
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const { formatSummary, resolveThresholds, runDeepResearchEval } = await import(
  `../../${distEntry}`
);

await mkdir(outDir, { recursive: true });

const thresholds = resolveThresholds(
  args.thresholds ? JSON.parse(args.thresholds) : undefined,
);

const summary = await runDeepResearchEval({
  taskPackPath: taskpack,
  reportsPath: reports,
  outDir,
  runId,
  dryRun: true,
  thresholds,
  waiverPath,
});

const formatted = formatSummary(summary, thresholds);

const statusLine = `${formatted.status.toUpperCase()}: ${formatted.message}`;
console.log(statusLine);

if (formatted.status === 'fail' && mode === 'strict') {
  process.exitCode = 1;
}
