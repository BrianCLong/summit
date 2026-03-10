import { describe, expect, it } from 'vitest';

import actionFixture from '../fixtures/action.coordinated-posting.example.json';
import { validateActionSignature } from '../validate/validateActionSignature';

describe('PG action signature validation', () => {
  it('accepts valid analytic action signature', () => {
    const report = validateActionSignature(actionFixture);
    expect(report.ok).toBe(true);
    expect(report.schemaErrors).toEqual([]);
    expect(report.semanticViolations).toEqual([]);
  });

  it('rejects prescriptive wording heuristically', () => {
    const bad = {
      ...actionFixture,
      description: 'How to execute this optimally',
    };

    const report = validateActionSignature(bad);
    expect(report.ok).toBe(false);
    expect(
      report.semanticViolations.some(
        (violation) => violation.code === 'PG_SV_PRESCRIPTIVE_LANGUAGE',
      ),
    ).toBe(true);
  });
});
