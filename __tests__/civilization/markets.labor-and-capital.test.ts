import { test } from 'node:test';
import * as assert from 'node:assert';
import { LaborMarket } from '../../markets/labor/LaborMarket.js';

test('LaborMarket posts job', () => {
  const market = new LaborMarket();
  assert.doesNotThrow(() => {
    market.postJob({ kind: 'POST_JOB', employerId: 'a1', budget: 100 });
  });
});
