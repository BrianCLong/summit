import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

describe('Evidence ID Consistency Script', () => {
  const scriptPath = path.join(REPO_ROOT, 'scripts/ci/verify_evidence_id_consistency.mjs');

  it('should pass for clean repo state (since we added valid evidence)', () => {
    try {
      execSync(`node ${scriptPath}`, { stdio: 'pipe' });
    } catch (e) {
      assert.fail(`Script failed with exit code ${e.status}: ${e.stderr.toString()}`);
    }
  });

  it('should support --help', () => {
    const output = execSync(`node ${scriptPath} --help`, { encoding: 'utf8' });
    assert.ok(output.includes('Usage:'), 'Help output should include Usage');
  });

  it('should fail if invalid ID is introduced', () => {
    // We'll create a temporary file with an invalid ID
    const tempFile = path.join(REPO_ROOT, 'docs/governance/temp_test_evidence.md');
    fs.writeFileSync(tempFile, '# Test\n<!-- Evidence ID: INVALID-999 -->\n');

    try {
      execSync(`node ${scriptPath}`, { stdio: 'pipe' });
      assert.fail('Script should have failed but passed');
    } catch (e) {
      assert.strictEqual(e.status, 1, 'Exit code should be 1 for violations');
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  it('should produce deterministic artifacts', () => {
     // Run twice
     execSync(`node ${scriptPath}`, { stdio: 'pipe' });
     const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
     const artifactDir = path.join(REPO_ROOT, `artifacts/governance/evidence-id-consistency/${sha}`);

     const report1 = fs.readFileSync(path.join(artifactDir, 'report.json'), 'utf8');

     execSync(`node ${scriptPath}`, { stdio: 'pipe' });
     const report2 = fs.readFileSync(path.join(artifactDir, 'report.json'), 'utf8');

     assert.strictEqual(report1, report2, 'report.json should be identical');
  });
});
