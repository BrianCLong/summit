import { shortestPath } from '../src/index';
it('shortestPath returns a path', async () => {
  const p = await shortestPath();
  expect(Array.isArray(p)).toBe(true);
});
