import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';

test('Safety regression catches abuse', () => {
  const cartel = JSON.parse(fs.readFileSync('__tests__/fixtures/civilization/abuse/collusion-cartel.fixture.json', 'utf8'));
  assert.strictEqual(cartel.scenario, 'collusion-cartel');
});
