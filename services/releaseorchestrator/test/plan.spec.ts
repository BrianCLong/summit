import { planRelease } from '../src/plan';
test('bubbles dependents', () => {
  const p = planRelease(['services/conductor']);
  expect(p.queue.includes('client')).toBeDefined();
});
