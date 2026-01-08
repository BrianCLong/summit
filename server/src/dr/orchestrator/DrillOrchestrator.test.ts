
import { test } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs/promises';
import { DrillOrchestrator } from './DrillOrchestrator.js';
import os from 'os';

test('DrillOrchestrator', async (t) => {
    const orchestrator = new DrillOrchestrator();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-test-'));
    process.env.DR_REPORT_DIR = tempDir;

    const planPath = path.join(process.cwd(), 'server/src/dr/plans/backup-restore.json');
    const plan = await orchestrator.loadPlan(planPath);

    await t.test('loads plan correctly', async () => {
        assert.strictEqual(plan.id, 'backup-restore-rehearsal');
        assert.strictEqual(plan.steps.length, 5);
    });

    await t.test('executes dry-run successfully', async () => {
        const report = await orchestrator.executeDrill(plan, 'dry-run');
        assert.strictEqual(report.success, true);
        assert.strictEqual(report.mode, 'dry-run');
        assert.strictEqual(report.steps.length, 5);
        assert.ok(report.steps[0].logs[0].includes('[DRY-RUN]'));
    });

    await t.test('generates reports', async () => {
        const files = await fs.readdir(tempDir);
        assert.ok(files.includes('drill-report.json'));
        assert.ok(files.includes('drill-report.md'));
    });

    await fs.rm(tempDir, { recursive: true, force: true });
});
