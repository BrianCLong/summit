import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('schemas exist and are valid JSON', () => {
  const schemas = ['trace', 'plan', 'metrics', 'report', 'stamp'];
  for (const name of schemas) {
    const path = `adk/spec/${name}.schema.json`;
    assert.ok(fs.existsSync(path), `Schema ${name} does not exist`);
    const content = fs.readFileSync(path, 'utf8');
    assert.doesNotThrow(() => JSON.parse(content), `Schema ${name} is invalid JSON`);
  }
});
