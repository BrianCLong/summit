import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readJsonLines, writeJsonLines } from './lib/jsonl.mjs';
import { hashEntry } from './lib/compare.mjs';

const inputPath =
  process.env.GRAPH_COMPARE_OUTPUT ??
  process.argv[2] ??
  path.join('graph_compare', `${new Date().toISOString().slice(0, 10)}.jsonl`);
const outputPath =
  process.env.CONSISTENCY_LEDGER_PATH ??
  process.argv[3] ??
  path.join('consistency_ledger', `${new Date().toISOString().slice(0, 10)}.jsonl`);

function resolveCommit() {
  if (process.env.GIT_COMMIT) {
    return process.env.GIT_COMMIT;
  }
  const output = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  return output;
}

const commit = resolveCommit();
const runnerHost = process.env.RUNNER_HOST ?? os.hostname();
const now = new Date().toISOString();

const entries = readJsonLines(inputPath).map((entry) => {
  const enriched = {
    ts: now,
    ...entry,
    runner: {
      host: runnerHost,
      commit,
    },
  };
  return {
    ...enriched,
    hash: hashEntry(enriched),
  };
});

writeJsonLines(outputPath, entries);

console.log(`Consistency ledger written to ${outputPath}`);
