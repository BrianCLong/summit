import { describe, expect, it } from 'vitest';
import { validateActionSignature } from '../validate/validateActionSignature';

describe('validateActionSignature', () => {
  it('accepts a valid action signature', () => {
    const validSignature = {
      id: "pg.action.sig.coordinated-posting.v1",
      label: "Coordinated posting signature",
      indicators: [
        { id: "ind1", signal: "coordinated posting pattern", weight: 0.7, evidenceKinds: ["post", "report"] }
      ],
      provenance: { source: "seed", createdAt: "2026-03-05T00:00:00Z", curator: "summit.seed" }
    };

    const report = validateActionSignature(validSignature);
    expect(report.ok).toBe(true);
    expect(report.schemaErrors).toEqual([]);
  });

  it('rejects an invalid action signature', () => {
    const invalidSignature = {
      id: "pg", // too short
      label: "Co", // too short
      indicators: [], // missing items
      provenance: { source: "seed", createdAt: "invalid-date", curator: "a" }
    };

    const report = validateActionSignature(invalidSignature);
    expect(report.ok).toBe(false);
    expect(report.schemaErrors.length).toBeGreaterThan(0);
  });
});
