import { privateSetIntersect } from '../../src/psi';

test('psi mock intersects', async () => {
  const r = await privateSetIntersect(['a', 'b'], ['b', 'c']);
  expect(r).toEqual(['b']);
});
