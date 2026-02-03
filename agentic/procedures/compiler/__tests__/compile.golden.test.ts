import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProcedureFromFile } from '../../loader';
import { compileProcedure, serializePlan } from '../compile';

const baseDir = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(baseDir, '..', '..', '..', '..', 'procedures', 'examples');

test('compiled plan matches golden output', async () => {
  const procedure = await loadProcedureFromFile(
    resolve(examplesDir, 'basic-investigation.yaml'),
  );
  const plan = compileProcedure(procedure);
  const serialized = serializePlan(plan);
  const golden = await readFile(
    resolve(examplesDir, 'basic-investigation.plan.json'),
    'utf8',
  );
  assert.equal(serialized, golden);
});
