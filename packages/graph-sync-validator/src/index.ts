import { mkdir } from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadEntityMap, loadRuntimeConfig } from './config.js';
import { compareNormalized } from './diff/compare.js';
import { readNeoSnapshot } from './loader/neo4jReader.js';
import { readPgSnapshot } from './loader/pgReader.js';
import { applyRepairPlan } from './repair/jobs.js';
import { planRepairs } from './repair/planner.js';
import {
  printTextTable,
  writeJsonl,
  writeJUnit,
  writeParityTxt,
} from './reporting/formats.js';
import { pageIfNeeded } from './reporting/alerts.js';
import { recordDrift } from './reporting/metrics.js';

type Mode = 'audit' | 'repair';

type ParsedArgs = {
  entity: string;
  batch: number;
  since?: string;
  dryRun: boolean;
  canary: number;
  output: string;
  outdir: string;
  deleteExtras: boolean;
};

export async function main(argv: string[], mode: Mode) {
  const parsed = (await yargs(hideBin(argv))
    .option('entity', {
      type: 'string',
      describe: 'Comma-separated entity types',
      default: '',
    })
    .option('batch', { type: 'number', default: 1000 })
    .option('since', { type: 'string' })
    .option('dry-run', { type: 'boolean', default: false })
    .option('canary', { type: 'number', default: 0 })
    .option('output', { type: 'string', default: 'text' })
    .option('outdir', { type: 'string', default: 'artifacts/graph-parity' })
    .option('delete-extras', { type: 'boolean', default: false })
    .strict()
    .parse()) as unknown as ParsedArgs;

  const entities = parsed.entity
    ? parsed.entity
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;

  const cfg = loadRuntimeConfig({
    batchSize: parsed.batch,
    since: parsed.since,
    output: parsed.output.split(',') as Array<'jsonl' | 'junit' | 'text'>,
  });

  const entityMap = loadEntityMap(cfg.entityMapPath);

  const pg = await readPgSnapshot({
    pgDsn: cfg.pgDsn,
    entityMap,
    entities,
    batchSize: cfg.batchSize,
    since: cfg.since,
  });

  const neo = await readNeoSnapshot({
    neo4jUri: cfg.neo4jUri,
    neo4jUser: cfg.neo4jUser,
    neo4jPass: cfg.neo4jPass,
    entityMap,
    entities,
    batchSize: cfg.batchSize,
  });

  const drift = compareNormalized(pg.nodes, neo.nodes, pg.edges, neo.edges);

  recordDrift(drift, 'all');
  await pageIfNeeded(drift, cfg.parityThreshold);

  const outdir = parsed.outdir;
  await mkdir(outdir, { recursive: true });

  if (cfg.output.includes('jsonl')) {
    writeJsonl(drift, `${outdir}/drift.jsonl`);
  }
  if (cfg.output.includes('junit')) {
    writeJUnit(drift, `${outdir}/junit.xml`);
  }
  writeParityTxt(drift, `${outdir}/parity.txt`);
  if (cfg.output.includes('text')) {
    printTextTable(drift);
  }

  if (mode === 'audit') {
    if (drift.parity < cfg.parityThreshold) {
      process.exitCode = 2;
    }
    return;
  }

  const plan = planRepairs(drift, {
    deleteExtras: Boolean(parsed.deleteExtras),
  });

  const res = await applyRepairPlan({
    neo4jUri: cfg.neo4jUri,
    neo4jUser: cfg.neo4jUser,
    neo4jPass: cfg.neo4jPass,
    actions: plan.actions,
    dryRun: Boolean(parsed.dryRun),
    canaryPct: Number(parsed.canary ?? 0),
    allowRepair:
      cfg.allowRepair &&
      [
        'development',
        'test',
        'staging',
        'prod-canary',
        'production',
      ].includes(cfg.env),
  });

  console.log(
    `repair_actions=${plan.actions.length} applied=${res.applied} skipped=${res.skipped}`,
  );
}
