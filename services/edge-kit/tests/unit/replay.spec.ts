import { replay } from '../../src/replay';

test('deterministic replay', () => {
  const s = replay([
    { ts: 2, op: 'set', key: 'x', value: 2 },
    { ts: 1, op: 'set', key: 'x', value: 1 },
  ]);
  expect(s.x).toBe(2);
});

test('supports delete and merge operations', () => {
  const state = replay([
    { ts: 1, op: 'set', key: 'user', value: { name: 'a' } },
    { ts: 2, op: 'merge', key: 'user', value: { role: 'admin' } },
    { ts: 3, op: 'delete', key: 'user' },
    { ts: 4, op: 'set', key: 'flag', value: true },
    { ts: 5, op: 'clear' },
  ]);
  expect(state).toEqual({});
});
