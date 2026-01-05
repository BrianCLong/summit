import { describe, expect, it } from '@jest/globals';
import {
  applyDisclosurePolicy,
  enforceRetentionWindow,
} from '../export-service.js';

describe('Disclosure export policy', () => {
  it('filters requested artifacts by disclosure scope', () => {
    const result = applyDisclosurePolicy({
      requestedArtifacts: ['audit-trail', 'attestations', 'sbom'],
      disclosureScope: 'public',
    });

    expect(result.artifacts).toEqual(['sbom']);
  });

  it('intersects requested allowlist with disclosure allowlist', () => {
    const result = applyDisclosurePolicy({
      requestedArtifacts: ['audit-trail'],
      disclosureScope: 'partner',
      requestedAllowedFields: ['id', 'status', 'user_id'],
    });

    expect(result.allowedFields).toEqual(['id', 'status', 'user_id']);
  });

  it('rejects requests outside retention window', () => {
    const now = new Date('2025-01-10T00:00:00Z');
    const startTime = new Date('2024-12-01T00:00:00Z');
    const endTime = new Date('2024-12-02T00:00:00Z');

    expect(() =>
      enforceRetentionWindow({
        startTime,
        endTime,
        retentionDays: 10,
        now,
      }),
    ).toThrow('retention_window_exceeded');
  });
});
