import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from '../lib/hash.js';
import { stableStringify } from '../lib/json_stable.js';

const outDir = path.resolve('out/metrics');
await mkdir(outDir, { recursive: true });

const configPath = path.resolve('intelgraph/pipelines/narrative_ci/config/defaults.yml');
const configContents = await readFile(configPath, 'utf-8');
const payload = {
  run_id: 'fixture-run',
  config_hash: sha256(configContents),
  handoff_candidates: [],
};

await writeFile(
  path.join(outDir, 'handoff_candidates.json'),
  `${stableStringify(payload)}\n`,
  'utf-8',
);

console.log('Handoff candidates written');
