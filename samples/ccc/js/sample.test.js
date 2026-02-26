import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../..');
const { withConsent, getTelemetry, resetTelemetry, ConsentViolation } = await import(
  path.join(root, 'generated/ccc/js/index.js')
);

test('allows approved scope/purpose combinations', () => {
  resetTelemetry();
  const guard = withConsent('profile.read', 'analytics');
  const result = guard(() => ({ ok: true }));
  assert.deepEqual(result, { ok: true });
  const telemetry = getTelemetry();
  assert.equal(telemetry[0].lawfulBasis, 'legitimate_interest');
});

test('throws when purpose is disallowed', () => {
  assert.throws(() => {
    withConsent('profile.read', 'advertising');
  }, ConsentViolation);
});
