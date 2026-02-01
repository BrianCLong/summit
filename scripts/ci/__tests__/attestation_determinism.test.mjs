import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { promises as fs } from 'node:fs';
import { resolve, join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

function hasTimestampKeys(obj) {
  if (obj === null || typeof obj !== 'object') return false;

  if (Array.isArray(obj)) {
    return obj.some(item => hasTimestampKeys(item));
  }

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('timestamp') ||
        lowerKey.includes('generated_at') ||
        lowerKey.includes('created_at') ||
        lowerKey.includes('updated_at') ||
        lowerKey.includes('last_updated') ||
        lowerKey.includes('execution_time') ||
        lowerKey === 'time') {
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (hasTimestampKeys(value)) return true;
    }
  }
  return false;
}

describe('Attestation Determinism', () => {
  const attestationA = 'test_attestation_a.json';
  const attestationB = 'test_attestation_b.json';

  test('identical inputs produce byte-identical attestations', async () => {
    const scope = 'server client scripts/ci';

    // First run
    await execAsync(`node scripts/ci/generate_attestation.mjs --out ${attestationA} ${scope}`);

    // Second run
    await execAsync(`node scripts/ci/generate_attestation.mjs --out ${attestationB} ${scope}`);

    const contentA = await fs.readFile(attestationA, 'utf8');
    const contentB = await fs.readFile(attestationB, 'utf8');

    assert.strictEqual(contentA, contentB, 'Attestations from two identical runs must be byte-identical');

    const objA = JSON.parse(contentA);

    // Ensure no timestamps
    assert.ok(!hasTimestampKeys(objA), 'attestation.json should not contain timestamp-like keys');

    // Ensure verification script passes
    await execAsync(`node scripts/ci/verify_attestation.mjs --input ${attestationA}`);

    // Cleanup
    await fs.unlink(attestationA);
    await fs.unlink(attestationB);
  });

  test('evidence emission is also deterministic (except stamp.json timestamp)', async () => {
    const scope = 'server client scripts/ci';
    const attestation = 'test_final.json';
    const evidence1 = 'test_evidence_1';
    const evidence2 = 'test_evidence_2';

    await execAsync(`node scripts/ci/generate_attestation.mjs --out ${attestation} ${scope}`);

    await execAsync(`node scripts/ci/emit_attestation_evidence.mjs --attestation ${attestation} --out-dir ${evidence1}`);
    await execAsync(`node scripts/ci/emit_attestation_evidence.mjs --attestation ${attestation} --out-dir ${evidence2}`);

    const report1 = await fs.readFile(join(evidence1, 'report.json'), 'utf8');
    const report2 = await fs.readFile(join(evidence2, 'report.json'), 'utf8');
    assert.strictEqual(report1, report2, 'report.json must be deterministic');

    const metrics1 = await fs.readFile(join(evidence1, 'metrics.json'), 'utf8');
    const metrics2 = await fs.readFile(join(evidence2, 'metrics.json'), 'utf8');
    assert.strictEqual(metrics1, metrics2, 'metrics.json must be deterministic');

    const stamp1 = await fs.readFile(join(evidence1, 'stamp.json'), 'utf8');
    const stamp2 = await fs.readFile(join(evidence2, 'stamp.json'), 'utf8');
    assert.strictEqual(stamp1, stamp2, 'stamp.json must be deterministic (since it uses commit time)');

    // Cleanup
    await fs.unlink(attestation);
    await fs.rm(evidence1, { recursive: true });
    await fs.rm(evidence2, { recursive: true });
  });
});
