import { describe, test } from 'node:test';
import assert from 'node:assert';
import { recommendVM } from '../../subsumption/azure-turin-v7/recommender/recommend.mjs';

describe('Azure v7 Recommender', () => {
  test('is disabled by default', () => {
      delete process.env.SUMMIT_AZURE_TURIN_V7_RECOMMENDER;
      const res = recommendVM('web');
      assert.equal(res.status, 'disabled');
  });

  test('works when enabled', () => {
      process.env.SUMMIT_AZURE_TURIN_V7_RECOMMENDER = '1';
      assert.equal(recommendVM('web'), 'Dasv7');
      assert.equal(recommendVM('cache'), 'Eadsv7');
  });
});
