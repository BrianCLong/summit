import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execAsync = promisify(exec);

test('Attestation generation is deterministic', async (t) => {
  await t.test('running twice produces identical JSON', async () => {
    const file1 = 'attestation1.json';
    const file2 = 'attestation2.json';

    // Use positionals to limit scope and speed up test
    await execAsync(`node scripts/ci/generate_attestation.mjs --out ${file1} server client scripts/ci`);
    await execAsync(`node scripts/ci/generate_attestation.mjs --out ${file2} server client scripts/ci`);

    const content1 = await fs.readFile(file1, 'utf8');
    const content2 = await fs.readFile(file2, 'utf8');

    assert.strictEqual(content1, content2, 'JSON outputs must be byte-identical');

    // Cleanup
    await fs.unlink(file1);
    await fs.unlink(file2);
  });

  await t.test('no time-like fields in attestation', async () => {
    const file = 'attestation_time_test.json';
    await execAsync(`node scripts/ci/generate_attestation.mjs --out ${file} server client scripts/ci`);
    const content = await fs.readFile(file, 'utf8');
    const data = JSON.parse(content);

    const forbiddenKeys = ['time', 'timestamp', 'date', 'created_at', 'updated_at'];
    const allKeys = JSON.stringify(data);

    for (const key of forbiddenKeys) {
      assert.ok(!allKeys.includes(`"${key}"`), `Attestation should not contain key: ${key}`);
    }

    // Check for ISO-8601 patterns in values
    const isoPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    assert.ok(!isoPattern.test(content), 'Attestation should not contain ISO-8601 timestamps');

    await fs.unlink(file);
  });

  await t.test('evidence artifacts are deterministic', async () => {
    const attestation = 'attestation_ev.json';
    const evidence1 = 'evidence1';
    const evidence2 = 'evidence2';

    await execAsync(`node scripts/ci/generate_attestation.mjs --out ${attestation} server client scripts/ci`);

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
