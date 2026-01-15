import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const SCRIPT_PATH = path.join(ROOT_DIR, 'scripts/ops/command-center.ts');
const FIXTURES_DIR = path.join(ROOT_DIR, 'scripts/ops/__fixtures__');
const OUTPUT_FILE = path.join(ROOT_DIR, 'docs/ops/COMMAND_CENTER.md');

// Create a temporary directory for tests
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'command-center-test-'));

// Helper to copy fixtures to temp dir
function setupTempFixtures(sourceDir: string, targetDir: string) {
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.cpSync(sourceDir, targetDir, { recursive: true });
}

test('Command Center Generator (Offline Mode)', async (t) => {
  // Setup: Copy fixtures to a temp location to avoid modifying source
  setupTempFixtures(FIXTURES_DIR, TMP_DIR);

  t.after(() => {
    // Cleanup
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  await t.test('generates report from fixtures', () => {
    // Run the script pointing to temp fixtures
    execSync(`npx tsx ${SCRIPT_PATH} --mode=offline --snapshotsDir=${TMP_DIR}`, {
      encoding: 'utf-8',
      cwd: ROOT_DIR
    });

    // Check if file exists
    assert.ok(fs.existsSync(OUTPUT_FILE), 'Output file should be created');

    // Check content
    const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');

    assert.match(content, /# Command Center Report/, 'Should have title');
    assert.match(content, /## 1. Executive Summary/, 'Should have summary');
    assert.match(content, /fixture: green pr/, 'Should contain fixture PR');
    assert.match(content, /No P0 issues found/, 'Should report no P0s');
  });

  await t.test('exits non-zero on P0 if configured', () => {
    // Create P0 issue in the temp directory
    const p0IssuesPath = path.join(TMP_DIR, 'issues.json');
    fs.writeFileSync(p0IssuesPath, JSON.stringify([
      { number: 666, title: 'Critical Bug', labels: [{ name: 'P0' }], updatedAt: '', state: 'OPEN' }
    ]));

    try {
        execSync(`npx tsx ${SCRIPT_PATH} --mode=offline --snapshotsDir=${TMP_DIR} --failOnP0`, {
            encoding: 'utf-8',
            cwd: ROOT_DIR,
            stdio: 'pipe' // Capture output
        });
        assert.fail('Should have failed due to P0');
    } catch (e: any) {
        assert.equal(e.status, 1, 'Exit code should be 1');
        assert.match(e.stderr.toString(), /P0 issues detected/, 'Should log P0 detection');
    }
  });
});
