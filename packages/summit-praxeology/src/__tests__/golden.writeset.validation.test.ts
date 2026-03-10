import { describe, expect, it } from 'vitest';

import writeSetFixture from '../fixtures/writeset.pg.example.json';
import { validatePGWriteSet } from '../validate/validatePGWriteSet';

describe('PG WriteSet validation', () => {
  it('accepts quarantined PG writeset', () => {
    const report = validatePGWriteSet(writeSetFixture);
    expect(report.ok).toBe(true);
    expect(report.schemaErrors).toEqual([]);
    expect(report.semanticViolations).toEqual([]);
  });

  it('rejects non-quarantine mode', () => {
    const bad = {
      ...writeSetFixture,
      mode: 'promote',
    };

    const report = validatePGWriteSet(bad);
    expect(report.ok).toBe(false);
    expect(
      report.semanticViolations.some(
        (violation) => violation.code === 'PG_WS_MUST_BE_QUARANTINED',
      ),
    ).toBe(true);
  });

  it('rejects missing neverPromoteToReality', () => {
    const bad = {
      ...writeSetFixture,
      safety: {
        analyticOnly: true,
        neverPromoteToReality: false,
      },
    };

    const report = validatePGWriteSet(bad);
    expect(report.ok).toBe(false);
    expect(
      report.semanticViolations.some(
        (violation) => violation.code === 'PG_WS_NEVER_PROMOTE_TO_REALITY',
      ),
    ).toBe(true);
  });
});
