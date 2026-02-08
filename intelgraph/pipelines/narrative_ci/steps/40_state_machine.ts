import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stableStringify } from '../lib/json_stable.js';

const outDir = path.resolve('out/narratives');
await mkdir(outDir, { recursive: true });

const payload = {
  run_id: 'fixture-run',
  transitions: [],
};

await writeFile(
  path.join(outDir, 'state_transitions.json'),
  `${stableStringify(payload)}\n`,
  'utf-8',
);

console.log('Narrative state transitions written');
