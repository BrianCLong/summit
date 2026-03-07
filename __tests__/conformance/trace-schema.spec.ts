import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('trace schema should be valid json', () => {
  const schemaPath = path.resolve('adk/spec/trace.schema.json');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  assert.doesNotThrow(() => JSON.parse(schemaContent));
});
