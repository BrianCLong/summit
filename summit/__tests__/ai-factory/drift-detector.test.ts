import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { detectDrift } from '../../scripts/monitoring/ai-factory-drift';

test('detectDrift produces report artifact', async () => {
  await detectDrift();
  assert.ok(fs.existsSync('artifacts/monitoring/ai-factory-drift/report.json'));
});
