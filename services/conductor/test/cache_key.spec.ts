import { stepCacheKey } from '../src/cache/key';
test('cache key changes with params', () => {
  const k1 = stepCacheKey({
    pluginDigest: 'sha256:a',
    inputDigests: ['d1'],
    params: { x: 1 },
  });
  const k2 = stepCacheKey({
    pluginDigest: 'sha256:a',
    inputDigests: ['d1'],
    params: { x: 2 },
  });
  expect(k1).not.toBe(k2);
});
