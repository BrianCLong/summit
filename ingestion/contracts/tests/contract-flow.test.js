import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  createIngestionRegistry,
  diffSpecs,
  validateConformance,
} from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixtures = JSON.parse(readFileSync(join(__dirname, '../fixtures/contract-specs.json'), 'utf8'));

function buildRegistry() {
  return createIngestionRegistry('dpic-certifier');
}

async function certify(registry, spec, secret) {
  registry.register(spec);
  return registry.certify(spec.id, secret);
}

export async function testContractDrift() {
  const changes = diffSpecs(fixtures.baseline, fixtures.candidate);
  assert(changes.some((entry) => entry.includes('unit changed')));
  assert(changes.some((entry) => entry.includes('Field errorCode added')));
}

export async function testQuarantineFixAndRecertify() {
  const registry = buildRegistry();
  await certify(registry, fixtures.baseline, 'shared-secret');
  const invalidPayload = { deviceId: 'dev-1', temperatureC: 'too-hot', timestamp: null };
  const outcome = await registry.validateIngestion('dpic-telemetry', invalidPayload, 'staging', 'shared-secret');
  assert.equal(outcome.status, 'quarantined');
  assert.ok(outcome.quarantineRecord);
  const resolved = registry.recertifyAfterResolution('dpic-telemetry', 'shared-secret');
  assert.ok(resolved instanceof Promise);
}

export async function testProductionRequiresCertificate() {
  const registry = buildRegistry();
  registry.register(fixtures.baseline);
  const outcome = await registry.validateIngestion(
    fixtures.baseline.id,
    { deviceId: 'dev-1', temperatureC: 20, timestamp: '2024-01-01T00:00:00Z' },
    'production',
    'shared-secret',
  );
  assert.equal(outcome.status, 'rejected');
  assert.match(outcome.reason ?? '', /certificate/);
}

export async function testPrivacyFlags() {
  const conformance = validateConformance(fixtures.baseline, {
    deviceId: 'dev-1',
    temperatureC: 20,
    timestamp: '2024-01-01T00:00:00Z',
  });
  assert.equal(conformance.piiFlagsValid, true);
  assert.equal(conformance.dpFlagsValid, true);
}
