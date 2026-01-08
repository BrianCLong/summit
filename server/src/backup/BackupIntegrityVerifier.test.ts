
import { test } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs/promises';
import { BackupIntegrityVerifier } from './BackupIntegrityVerifier.js';
import os from 'os';

test('BackupIntegrityVerifier', async (t) => {
    const verifier = new BackupIntegrityVerifier();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-verify-test-'));

    await t.test('generates valid synthetic backup', async () => {
        const manifest = await verifier.simulateBackup({
            outputDir: tempDir,
            artifactCount: 2
        });

        assert.strictEqual(manifest.files.length, 2);
        assert.ok(manifest.backupId.startsWith('sim-'));

        const verification = await verifier.verify(path.join(tempDir, 'manifest.json'));
        assert.ok(verification.success);
        assert.strictEqual(verification.checks.length, 2);
    });

    await t.test('detects corrupted backup', async () => {
        const corruptDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-verify-corrupt-'));
        await verifier.simulateBackup({
            outputDir: corruptDir,
            artifactCount: 2,
            corruptArtifactIndex: 1 // Corrupt the second file
        });

        const verification = await verifier.verify(path.join(corruptDir, 'manifest.json'));
        assert.strictEqual(verification.success, false);
        assert.strictEqual(verification.errors.length, 1);
        assert.match(verification.errors[0].error, /Checksum mismatch/);

        // cleanup
        await fs.rm(corruptDir, { recursive: true, force: true });
    });

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
});
