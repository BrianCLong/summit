import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCost,
  DEFAULT_CAPS,
  estimateTokens,
  getModelById,
  listModels,
  normalizeCaps,
} from '../src/index.js';

test('estimateTokens provides deterministic output', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('word'), 1);
  assert.equal(estimateTokens('four score and seven years ago'), 8);
});

test('normalizeCaps merges defaults correctly', () => {
  assert.deepEqual(normalizeCaps(undefined), DEFAULT_CAPS);
  assert.deepEqual(normalizeCaps({ hardUsd: 2, tokenCap: 1000 }), {
    hardUsd: 2,
    softPct: DEFAULT_CAPS.softPct,
    tokenCap: 1000,
    rpm: DEFAULT_CAPS.rpm,
  });
});

test('models can be filtered and cost calculated', () => {
  const localModels = listModels({ local: true });
  assert.ok(localModels.length > 0);
  assert.ok(localModels.every((model) => model.local === true));

  const mixtral = getModelById('mixtral-8x22b-instruct');
  assert.ok(mixtral);
  const cost = calculateCost(mixtral, 1200, 800);
  assert.equal(cost.usd, 0);

  const paid = getModelById('gpt-4o-mini');
  const paidCost = calculateCost(paid, 1500, 500);
  assert.equal(paidCost.tokensIn, 1500);
  assert.equal(paidCost.tokensOut, 500);
  assert.ok(paidCost.usd > 0);
});
