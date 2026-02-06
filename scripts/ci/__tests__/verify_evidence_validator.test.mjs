import { describe, test } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyEvidence } from '../../../.github/scripts/verify-evidence.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaDir = path.resolve(process.cwd(), 'docs', 'governance', 'evidence', 'schemas');

function fixtureRoot(name) {
  return path.resolve(__dirname, 'fixtures', 'evidence-validator', name);
}

describe('verify-evidence validator', () => {
  test('passes when timestamps only in stamp.json', () => {
    const result = verifyEvidence({ rootDir: fixtureRoot('valid'), schemaDir });
    assert.strictEqual(result.ok, true);
  });

  test('fails when timestamps appear outside stamp.json', () => {
    const result = verifyEvidence({ rootDir: fixtureRoot('bad-timestamp'), schemaDir });
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('Timestamp values found outside stamp.json')));
  });
});
