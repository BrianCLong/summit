import { describe, expect, it } from 'vitest';
import playbook from '../fixtures/playbook.defensive.example.json';
import { validatePlaybook } from '../validate/validatePlaybook';

describe('PG playbook validation (golden path)', () => {
  it('accepts a valid analytic-only playbook', () => {
    const report = validatePlaybook(playbook);
    expect(report.ok).toBe(true);
    expect(report.schemaErrors).toEqual([]);
    expect(report.semanticViolations).toEqual([]);
  });

  it('rejects unknown prescriptive fields via schema', () => {
    const bad: any = {
      ...playbook,
      recommendedNextSteps: ['do X next']
    };

    const report = validatePlaybook(bad);
    expect(report.ok).toBe(false);
    expect(report.schemaErrors.length).toBeGreaterThan(0);
  });

  it('flags prescriptive language heuristics via SV', () => {
    const bad: any = {
      ...playbook,
      name: 'You should do this next step to achieve X'
    };

    const report = validatePlaybook(bad);
    expect(report.ok).toBe(false);
    expect(
      report.semanticViolations.some(
        (violation) => violation.code === 'PG_SV_PRESCRIPTIVE_LANGUAGE'
      )
    ).toBe(true);
  });
});
