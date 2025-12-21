import { describe, expect, it } from 'vitest';
import { costPerActiveTenant, evaluateBudget, validateTags } from '../src/tagging.js';

describe('tag validation', () => {
  it('requires mandatory tags', () => {
    const result = validateTags({
      id: 'res1',
      type: 'k8s',
      tags: { tenant: 't1', env: 'prod', service: 'api', owner: 'team', cost_center: 'cc1' },
    });
    expect(result.valid).toBe(true);

    const missing = validateTags({ id: 'res2', type: 'vm', tags: { tenant: 't1' } });
    expect(missing.valid).toBe(false);
    expect(missing.missing).toContain('service');
  });
});

describe('budget alerts and metrics', () => {
  it('emits warnings at 80/90/100 thresholds', () => {
    expect(evaluateBudget('t1', 1000, 850)?.threshold).toBe(0.8);
    expect(evaluateBudget('t1', 1000, 950)?.threshold).toBe(0.9);
    expect(evaluateBudget('t1', 1000, 1200)?.level).toBe('critical');
  });

  it('computes cost per active tenant', () => {
    const metric = costPerActiveTenant({ a: 100, b: 200 }, ['a', 'b']);
    expect(metric).toBe(150);
  });
});
