import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('AI Factory schemas exist and are valid JSON', () => {
  const schemas = [
    'plan',
    'pr-work-item',
    'architecture-review',
    'self-heal',
    'release-readiness'
  ];

  for (const name of schemas) {
    const content = fs.readFileSync(`schemas/ai-factory/${name}.schema.json`, 'utf8');
    assert.doesNotThrow(() => JSON.parse(content), `Schema ${name} is invalid JSON`);
  }
});
