import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPolicyFromFile } from '../../policy/loadPolicy';
import { loadProcedureFromFile } from '../../loader';
import { validateProcedure, ProcedureValidationError } from '../validate';

const baseDir = dirname(fileURLToPath(import.meta.url));
const policyPath = resolve(
  baseDir,
  '..',
  '..',
  '..',
  'policy',
  'default.policy.yaml',
);
const fixturesDir = resolve(baseDir, '..', '__fixtures__');
const examplesDir = resolve(baseDir, '..', '..', '..', '..', 'procedures', 'examples');

test('valid procedure passes policy checks', async () => {
  const policy = await loadPolicyFromFile(policyPath);
  const procedure = await loadProcedureFromFile(
    resolve(examplesDir, 'basic-investigation.yaml'),
  );
  assert.doesNotThrow(() => validateProcedure(procedure, policy));
});

test('rejects export to non-allowlisted destination', async () => {
  const policy = await loadPolicyFromFile(policyPath);
  const procedure = await loadProcedureFromFile(
    resolve(fixturesDir, 'abuse-egress.yaml'),
  );
  assert.throws(
    () => validateProcedure(procedure, policy),
    (error: unknown) =>
      error instanceof ProcedureValidationError &&
      error.code === 'POLICY_EXPORT_DESTINATION_DENIED',
  );
});

test('rejects smart-chaining adjacency', async () => {
  const policy = await loadPolicyFromFile(policyPath);
  const procedure = await loadProcedureFromFile(
    resolve(fixturesDir, 'abuse-smart-chain.yaml'),
  );
  assert.throws(
    () => validateProcedure(procedure, policy),
    (error: unknown) =>
      error instanceof ProcedureValidationError &&
      error.code === 'POLICY_FORBIDDEN_ADJACENCY',
  );
});

test('rejects schema injection payloads', async () => {
  const policy = await loadPolicyFromFile(policyPath);
  const procedure = await loadProcedureFromFile(
    resolve(fixturesDir, 'abuse-injection.yaml'),
  );
  assert.throws(
    () => validateProcedure(procedure, policy),
    (error: unknown) =>
      error instanceof ProcedureValidationError &&
      error.code === 'SCHEMA_INVALID',
  );
});
