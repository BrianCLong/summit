import { describe, expect, it } from '@jest/globals';
import { RetentionPolicyModel } from '../policyModel.js';
import { RetentionRecord } from '../types.js';

const baseRecord = (overrides: Partial<RetentionRecord> = {}): RetentionRecord =>
  ({
    metadata: {
      datasetId: 'ds-1',
      name: 'Dataset 1',
      dataType: 'analytics',
      containsPersonalData: false,
      jurisdictions: [],
      tags: [],
      storageSystems: ['postgres'],
      owner: 'tester',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      tenantId: 'tenant-1',
      caseId: 'case-1',
      evidenceType: 'video',
      ...(overrides.metadata || {}),
    },
    policy: {
      datasetId: 'ds-1',
      templateId: 'base-template',
      retentionDays: 90,
      purgeGraceDays: 10,
      legalHoldAllowed: true,
      storageTargets: ['postgres'],
      classificationLevel: 'internal',
      safeguards: [],
      appliedAt: new Date('2024-01-01T00:00:00.000Z'),
      appliedBy: 'system',
      ...(overrides.policy || {}),
    },
    archiveHistory: [],
    lastEvaluatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...(overrides as any),
  }) as RetentionRecord;

describe('RetentionPolicyModel', () => {
  it('applies tenant default over applied policy', () => {
    const model = new RetentionPolicyModel();
    model.setTenantDefault({
      tenantId: 'tenant-1',
      retentionDays: 45,
      purgeGraceDays: 5,
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      updatedBy: 'ops',
    });

    const resolved = model.resolve(baseRecord());
    expect(resolved.retentionDays).toBe(45);
    expect(resolved.purgeGraceDays).toBe(5);
    expect(resolved.source).toBe('tenant-default');
    expect(resolved.appliedLayers).toContain('tenant:tenant-1');
  });

  it('applies case override ahead of tenant default', () => {
    const model = new RetentionPolicyModel({
      tenants: [
        {
          tenantId: 'tenant-1',
          retentionDays: 120,
          purgeGraceDays: 7,
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
          updatedBy: 'ops',
        },
      ],
      cases: [
        {
          tenantId: 'tenant-1',
          caseId: 'case-1',
          retentionDays: 60,
          purgeGraceDays: 4,
          updatedAt: new Date('2024-01-03T00:00:00.000Z'),
          updatedBy: 'dpo',
          reason: 'Case-level override',
        },
      ],
    });

    const resolved = model.resolve(baseRecord());
    expect(resolved.retentionDays).toBe(60);
    expect(resolved.purgeGraceDays).toBe(4);
    expect(resolved.source).toBe('case-override');
    expect(resolved.appliedLayers).toEqual(
      expect.arrayContaining(['case:case-1', 'tenant:tenant-1']),
    );
  });

  it('applies evidence type override as highest precedence', () => {
    const model = new RetentionPolicyModel({
      tenants: [
        {
          tenantId: 'tenant-1',
          retentionDays: 90,
          purgeGraceDays: 6,
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
          updatedBy: 'ops',
        },
      ],
      cases: [
        {
          tenantId: 'tenant-1',
          caseId: 'case-1',
          retentionDays: 45,
          purgeGraceDays: 3,
          updatedAt: new Date('2024-01-03T00:00:00.000Z'),
          updatedBy: 'ops',
          reason: 'Case override',
        },
      ],
      evidenceTypes: [
        {
          tenantId: 'tenant-1',
          evidenceType: 'video',
          retentionDays: 15,
          purgeGraceDays: 2,
          updatedAt: new Date('2024-01-04T00:00:00.000Z'),
          updatedBy: 'legal',
          reason: 'Short-lived captures',
        },
      ],
    });

    const resolved = model.resolve(baseRecord());
    expect(resolved.retentionDays).toBe(15);
    expect(resolved.purgeGraceDays).toBe(2);
    expect(resolved.source).toBe('evidence-type-override');
    expect(resolved.appliedLayers).toEqual(
      expect.arrayContaining(['evidence:video', 'case:case-1', 'tenant:tenant-1']),
    );
  });
});
