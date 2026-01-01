import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import assert from 'assert';
import { test } from 'node:test';

const execPromise = util.promisify(exec);

// Paths
const ROOT_DIR = process.cwd();
const DOCS_DIR = path.join(ROOT_DIR, 'docs', 'ops');
const RUNBOOKS_DIR = path.join(DOCS_DIR, 'runbooks');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');

test('Operational Excellence Verification', async (t) => {

  await t.test('1. SLIs and Alerts Defined', () => {
    const sliFile = path.join(DOCS_DIR, 'SLI_SLO_ALERTS.md');
    assert.ok(fs.existsSync(sliFile), 'SLI_SLO_ALERTS.md should exist');

    const content = fs.readFileSync(sliFile, 'utf-8');
    assert.ok(content.includes('SLO'), 'Should define SLOs');
    assert.ok(content.includes('SEV-1'), 'Should define Severity levels');
  });

  await t.test('2. Runbooks Exist for Critical Areas', () => {
    const requiredRunbooks = [
      'INCIDENT_API.md',
      'INCIDENT_AGENT.md',
      'INCIDENT_COST.md',
      'INCIDENT_SECURITY.md',
      'INCIDENT_DATA_INTEGRITY.md'
    ];

    requiredRunbooks.forEach(book => {
      const bookPath = path.join(RUNBOOKS_DIR, book);
      assert.ok(fs.existsSync(bookPath), `Runbook ${book} should exist`);

      const content = fs.readFileSync(bookPath, 'utf-8');
      assert.ok(content.includes('Symptoms'), `${book} should have Symptoms section`);
      assert.ok(content.includes('Mitigation'), `${book} should have Mitigation section`);
    });
  });

  await t.test('3. Change Freeze Mechanics', async () => {
    // Enable Freeze
    await execPromise(`${path.join(SCRIPTS_DIR, 'enable-freeze.sh')} "Test Freeze"`);
    assert.ok(fs.existsSync('CHANGE_FREEZE_ACTIVE'), 'Freeze lockfile should be created');

    // Check Freeze (Should fail/exit 1)
    try {
      await execPromise(`${path.join(SCRIPTS_DIR, 'check-freeze.sh')}`);
      assert.fail('check-freeze should exit 1 when frozen');
    } catch (e: any) {
      assert.strictEqual(e.code, 1, 'Exit code should be 1');
    }

    // Disable Freeze
    await execPromise(`${path.join(SCRIPTS_DIR, 'disable-freeze.sh')}`);
    assert.ok(!fs.existsSync('CHANGE_FREEZE_ACTIVE'), 'Freeze lockfile should be removed');
  });

  await t.test('4. Incident Evidence Capture', async () => {
    const captureScript = path.join(SCRIPTS_DIR, 'capture-incident-evidence.ts');
    // Using tsx or similar to run typescript script if needed, or compile first.
    // For this test, we assume we can run it via node loader or it's compiled.
    // Since we wrote it as TS, we need to run it with a loader or transpile.
    // However, the verify suite itself is TS.

    // We will simulate the IncidentManager directly to avoid spawning complex subprocesses with TS loaders
    // inside this test environment if not configured.
    // But better to check the script existence at least.

    assert.ok(fs.existsSync(captureScript), 'capture-incident-evidence.ts should exist');

    const { IncidentManager } = await import('../../server/src/ops/incident/incident-manager.js');
    const mgr = IncidentManager.getInstance();
    const snapPath = await mgr.captureSnapshot({
        incidentId: 'TEST-VERIFY',
        severity: 'SEV-4',
        description: 'Test Verification',
        triggeredBy: 'Test Runner'
    });

    assert.ok(fs.existsSync(snapPath), 'Snapshot directory should be created');
    assert.ok(fs.existsSync(path.join(snapPath, 'metadata.json')), 'metadata.json should exist');

    // Cleanup
    fs.rmSync(snapPath, { recursive: true, force: true });
    // Also clean up the incidents dir if empty? No, keep it.
  });

});
