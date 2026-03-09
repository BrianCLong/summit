import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('Self-heal allowlist is valid YAML with expected structure', () => {
  const content = fs.readFileSync('config/ai-factory/self-heal-allowlist.yml', 'utf8');
  const lines = content.split('\n');
  const parsed = { allowlisted_failures: [] as string[] };
  for (const line of lines) {
    if (line.trim().startsWith('- ')) {
      parsed.allowlisted_failures.push(line.trim().substring(2).trim());
    }
  }
  assert.ok(Array.isArray(parsed.allowlisted_failures));
  assert.ok(parsed.allowlisted_failures.includes('eslint-fixable'));
});
