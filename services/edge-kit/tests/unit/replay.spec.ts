import { replay } from '../../src/replay';

test('deterministic replay', () => {
  const s = replay([
    { ts: 2, op: 'set', key: 'x', value: 2 },
    { ts: 1, op: 'set', key: 'x', value: 1 },
  ]);
  expect(s.x).toBe(2);
});
