import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const promptsDir = path.join(repoRoot, 'prompts');
const fixturesDir = path.join(promptsDir, 'fixtures', 'golden');

describe('Prompt Integrity (Node)', () => {
  test('golden fixtures exist and are not empty', () => {
    const files = [
      'README.md',
      'pr-metadata.sample.md',
      'prompt-integrity.sample.json',
      'agent-contract.sample.json',
    ];

    for (const file of files) {
      const fullPath = path.join(fixturesDir, file);
      assert.ok(fs.existsSync(fullPath), `${file} should exist`);
      const stats = fs.statSync(fullPath);
      assert.ok(stats.size > 50, `${file} should not be empty`);
    }
  });

  test('pr-metadata.sample.md has required markers', () => {
    const content = fs.readFileSync(
      path.join(fixturesDir, 'pr-metadata.sample.md'),
      'utf8'
    );
    assert.ok(content.includes('<!-- AGENT-METADATA:START -->'));
    assert.ok(content.includes('<!-- AGENT-METADATA:END -->'));
    assert.ok(content.includes('```json'));
  });
});
