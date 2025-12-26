import { dualRun } from '../../../refactor-harness/index.js';

describe('dualRun harness', () => {
  const legacy = (n: number) => n + 1;
  const candidate = (n: number) => n + 2;
  const comparator = (a: number, b: number) => a === b;

  test('off mode returns legacy result', () => {
    const fn = dualRun(legacy, candidate, comparator, 'off');
    expect(fn(1)).toBe(2);
  });

  test('shadow-log mode does not change output', () => {
    const fn = dualRun(legacy, candidate, comparator, 'shadow-log');
    expect(fn(1)).toBe(2);
  });

  test('enforce-new returns candidate result', () => {
    const fn = dualRun(legacy, candidate, comparator, 'enforce-new');
    expect(fn(1)).toBe(3);
  });
});
