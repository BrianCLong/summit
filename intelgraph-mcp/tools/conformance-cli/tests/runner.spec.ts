import { describe, it, expect } from 'vitest';
import { runAll } from '../src/runner';

describe('runAll', () => {
  it('aggregates check results', async () => {
    const res = await runAll('http://localhost:0');
    expect(res.summary.failed + res.summary.passed).toBe(res.checks.length);
  });
});
