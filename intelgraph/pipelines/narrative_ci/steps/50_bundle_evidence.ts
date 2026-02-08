import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildEvidenceId } from '../lib/ids.js';
import { sha256 } from '../lib/hash.js';
import { stableStringify } from '../lib/json_stable.js';

const args = new Set(process.argv.slice(2));
const fixtureMode = args.has('--fixture');

if (fixtureMode) {
  await import('./30_score_seeding.js');
  await import('./31_score_handoff.js');
  await import('./32_score_compression.js');
  await import('./40_state_machine.js');
}

const evidenceId = buildEvidenceId('METRICS', '001');
const evidenceDir = path.resolve('evidence', evidenceId);
await mkdir(evidenceDir, { recursive: true });

const configPath = path.resolve('intelgraph/pipelines/narrative_ci/config/defaults.yml');
const configContents = await readFile(configPath, 'utf-8');
const configHash = sha256(configContents);

const report = {
  evidence_id: evidenceId,
  run_id: 'fixture-run',
  config_hash: configHash,
  outputs: {
    seeding_density: 'out/metrics/seeding_density.json',
    handoff_candidates: 'out/metrics/handoff_candidates.json',
    compression_ratio: 'out/metrics/compression_ratio.json',
    state_transitions: 'out/narratives/state_transitions.json',
  },
};

const metrics = {
  run_id: 'fixture-run',
  totals: {
    narratives_scored: 0,
    handoff_candidates: 0,
  },
};

const stamp = {
  generated_at: new Date().toISOString(),
  run_id: 'fixture-run',
};

await writeFile(
  path.join(evidenceDir, 'report.json'),
  `${stableStringify(report)}\n`,
  'utf-8',
);
await writeFile(
  path.join(evidenceDir, 'metrics.json'),
  `${stableStringify(metrics)}\n`,
  'utf-8',
);
await writeFile(
  path.join(evidenceDir, 'stamp.json'),
  `${JSON.stringify(stamp, null, 2)}\n`,
  'utf-8',
);

const indexPath = path.resolve('evidence/index.json');
const indexContents = await readFile(indexPath, 'utf-8');
const index = JSON.parse(indexContents) as {
  version: number;
  items: Array<{ evidence_id: string; files: Record<string, string> }>;
};

const existing = index.items.some((item) => item.evidence_id === evidenceId);
if (!existing) {
  index.items.push({
    evidence_id: evidenceId,
    files: {
      report: `evidence/${evidenceId}/report.json`,
      metrics: `evidence/${evidenceId}/metrics.json`,
      stamp: `evidence/${evidenceId}/stamp.json`,
    },
  });
}

await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf-8');

console.log(`Evidence bundle written: ${evidenceId}`);
