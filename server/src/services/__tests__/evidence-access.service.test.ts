import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { EvidenceAccessService } from '../evidence-access.service.js';

const baseEvidence = {
  id: 'ev-1',
  storage_uri: 's3://evidence-bucket/runs/run-1/artifact.log',
  collected_at: new Date('2024-01-01T00:00:00Z'),
  metadata: {
    caseId: 'case-1',
    tenantId: 'tenant-1',
  },
};

describe('EvidenceAccessService signed URLs', () => {
  const auditLogger = { recordEvent: jest.fn().mockResolvedValue('audit-1') };

  beforeEach(() => {
    auditLogger.recordEvent.mockClear();
  });

  test('generates scoped signed URLs that validate', async () => {
    const service = new EvidenceAccessService({
      enableSignedUrls: true,
      enableTiered: false,
      signingKey: 'unit-test-key',
      signedUrlTtlSeconds: 60,
      auditLogger,
    });

    const access = await service.getAccessDescriptor(baseEvidence, {
      tenantId: 'tenant-1',
      caseId: 'case-1',
      derivativeType: 'thumbnail',
      now: new Date('2024-01-01T00:00:00Z'),
    });

    const validation = service.validateSignedToken(
      access.token!,
      'tenant-1',
      'case-1',
      new Date('2024-01-01T00:00:30Z'),
    );

    expect(validation.valid).toBe(true);
    expect(validation.payload?.derivativeType).toBe('thumbnail');
    expect(access.cacheControl).toContain('immutable');
    expect(auditLogger.recordEvent).toHaveBeenCalled();
  });

  test('rejects expired signed URLs', async () => {
    const service = new EvidenceAccessService({
      enableSignedUrls: true,
      enableTiered: false,
      signingKey: 'unit-test-key',
      signedUrlTtlSeconds: 30,
      auditLogger,
    });

    const access = await service.getAccessDescriptor(baseEvidence, {
      tenantId: 'tenant-1',
      caseId: 'case-1',
      derivativeType: 'original',
      now: new Date('2024-01-01T00:00:00Z'),
    });

    const validation = service.validateSignedToken(
      access.token!,
      'tenant-1',
      'case-1',
      new Date('2024-01-01T00:02:00Z'),
    );

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('expired');
  });
});

describe('EvidenceAccessService tiered lifecycle', () => {
  const auditLogger = { recordEvent: jest.fn().mockResolvedValue('audit-2') };

  test('moves evidence to cold tier after threshold while preserving access', async () => {
    const service = new EvidenceAccessService({
      enableSignedUrls: false,
      enableTiered: true,
      coldAfterDays: 1,
      auditLogger,
    });

    const evidence = {
      id: 'ev-2',
      storage_uri: 's3://evidence-bucket/runs/run-2/attestation.json',
      collected_at: new Date('2024-01-01T00:00:00Z'),
    };

    const access = await service.getAccessDescriptor(evidence, {
      tenantId: 'tenant-2',
      caseId: 'case-2',
      derivativeType: 'original',
      now: new Date('2024-01-03T00:00:00Z'),
    });

    expect(access.tier).toBe('cold');
    expect(access.url).toContain('cold');
    expect(access.direct).toBe(true);

    const state = await service.getTierState('ev-2');
    expect(state?.movedToColdAt).toBeDefined();
    expect(state?.lastAccessedAt?.toISOString()).toBe(
      new Date('2024-01-03T00:00:00.000Z').toISOString(),
    );
  });
});
