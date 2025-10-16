import { pack } from '../src/pack';
test('pack balances ETAs', () => {
  const shards = pack(['a.test.ts', 'b.test.ts', 'c.test.ts', 'd.test.ts'], 3);
  const etas = shards.map((s) => s.t);
  expect(Math.max(...etas) - Math.min(...etas)).toBeLessThan(20);
});
