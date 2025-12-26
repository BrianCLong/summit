import { rankWithShadowHarness } from '../../../server/src/search/refactorHarness.js';

describe('rankWithShadowHarness', () => {
  const docs = [
    { id: 'a', score: 0.4 },
    { id: 'b', score: 0.8 },
  ];

  test('returns ranked documents', () => {
    const ranked = rankWithShadowHarness('query', [...docs]);
    expect(ranked[0].id).toBe('b');
  });
});
