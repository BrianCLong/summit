import { knn } from '../src/conductor/models';

test('knn returns neighbors (empty without data)', async () => {
  const r = await knn('acme', 'entity-1', 5);
  expect(Array.isArray(r)).toBe(true);
});
