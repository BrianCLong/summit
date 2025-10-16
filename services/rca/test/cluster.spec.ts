import { cluster } from '../src/cluster';
test('clusters similar messages', () => {
  const A = cluster(
    ['TypeError: x', 'TypeError: y', 'Timeout 5000ms', 'Timeout exceeded'],
    2,
  );
  expect(new Set(A).size).toBe(2);
});
