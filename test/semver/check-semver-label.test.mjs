
import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = path.resolve(__dirname, '../../scripts/check-semver-label.ts');
const fixturePath = path.resolve(__dirname, 'temp-fixture.json');

// Helper to run script
const runScript = (fixtureData) => {
  fs.writeFileSync(fixturePath, JSON.stringify(fixtureData));
  try {
    // Run using npx tsx
    return execSync(`npx tsx ${scriptPath} ${fixturePath}`, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return error.stdout ? error.stdout.toString() : error.message;
  } finally {
    if (fs.existsSync(fixturePath)) {
      fs.unlinkSync(fixturePath);
    }
  }
};

describe('check-semver-label CLI', () => {
  it('should pass with a single valid label (major)', () => {
    const output = runScript({ pull_request: { labels: [{ name: 'major' }] } });
    assert.match(output, /Success: Found valid SemVer label "major"/);
  });

  it('should pass with a single valid label (semver:patch)', () => {
    const output = runScript({ pull_request: { labels: [{ name: 'semver:patch' }] } });
    assert.match(output, /Success: Found valid SemVer label "semver:patch"/);
  });

  it('should warn when no label is present', () => {
    const output = runScript({ pull_request: { labels: [] } });
    assert.match(output, /::warning::No valid SemVer label found/);
  });

  it('should warn when no valid label is found among others', () => {
    const output = runScript({ pull_request: { labels: [{ name: 'enhancement' }, { name: 'bug' }] } });
    assert.match(output, /::warning::No valid SemVer label found/);
  });

  it('should warn when multiple valid labels are present', () => {
    const output = runScript({ pull_request: { labels: [{ name: 'major' }, { name: 'minor' }] } });
    assert.match(output, /::warning::Multiple SemVer labels found/);
  });

  it('should pass with valid label mixed with invalid ones', () => {
    const output = runScript({ pull_request: { labels: [{ name: 'major' }, { name: 'enhancement' }] } });
    assert.match(output, /Success: Found valid SemVer label "major"/);
  });
});
