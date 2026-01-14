import path from 'node:path';
import { readJsonLines, writeJsonLines } from './lib/jsonl.mjs';
import { compareSnapshotToDeltas } from './lib/compare.mjs';

const snapshotPath =
  process.env.GRAPH_SNAPSHOT_PATH ??
  process.argv[2] ??
  path.join('graph_snapshot', `${new Date().toISOString().slice(0, 10)}.jsonl`);
const deltaPath =
  process.env.PG_DELTAS_PATH ??
  process.argv[3] ??
  path.join('pg_deltas', `${new Date().toISOString().slice(0, 10)}.jsonl`);
const outputPath =
  process.env.GRAPH_COMPARE_OUTPUT ??
  process.argv[4] ??
  path.join('graph_compare', `${new Date().toISOString().slice(0, 10)}.jsonl`);

const snapshotRecords = readJsonLines(snapshotPath);
const deltaRecords = readJsonLines(deltaPath);

const findings = compareSnapshotToDeltas({ snapshotRecords, deltaRecords });
writeJsonLines(outputPath, findings);

console.log(`Graph comparison findings written to ${outputPath}`);
