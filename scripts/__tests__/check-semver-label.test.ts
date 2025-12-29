import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = path.join(__dirname, '../check-semver-label.ts');

function runScript(mockLabels?: string): { status: number, stdout: string, stderr: string } {
  const env = { ...process.env, MOCK_LABELS: mockLabels };
  if (mockLabels === undefined) delete env.MOCK_LABELS;

  try {
    const stdout = execSync(`npx tsx ${scriptPath}`, { env, encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, stdout, stderr: '' };
  } catch (error: any) {
    return {
      status: error.status || 1,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || ''
    };
  }
}

describe('SemVer Label Check Script', () => {
  it('should pass with exactly one semver label (major)', () => {
    const result = runScript('major');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Found valid SemVer label 'major'/);
  });

  it('should pass with exactly one semver label (minor)', () => {
    const result = runScript('minor');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Found valid SemVer label 'minor'/);
  });

  it('should pass with exactly one semver label (patch)', () => {
    const result = runScript('patch');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Found valid SemVer label 'patch'/);
  });

  it('should pass if semver label is present along with other labels', () => {
    const result = runScript('feature, minor, ui');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Found valid SemVer label 'minor'/);
  });

  it('should fail if no semver label is present', () => {
    const result = runScript('feature, ui');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Error: No SemVer label found/);
  });

  it('should fail if multiple semver labels are present', () => {
    const result = runScript('major, minor');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Error: Multiple SemVer labels found/);
  });

  it('should fail if no labels provided', () => {
    const result = runScript('');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Error: No SemVer label found/);
  });
});
