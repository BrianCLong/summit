import type { AxiosInstance } from 'axios';
import {
  ConsentReconciler,
  HttpConsentApiClient,
  type ConsentApi,
  type ConsentRecord,
  type ConsentStateSnapshot,
  type ConsentDriftFinding,
} from '../src/consentReconciler';

describe('ConsentReconciler', () => {
  const baseSnapshot: ConsentStateSnapshot = {
    consentId: 'consent-1',
    source: 'identity-core',
    status: 'granted',
    version: 2,
    lastUpdated: '2025-01-02T12:00:00.000Z',
    jurisdiction: 'GLOBAL',
    dataSubjectId: 'user-1',
    lawfulBasis: 'consent',
    purposes: ['analytics', 'marketing'],
    proof: 'doc-123',
    retention: {
      expiresAt: '2026-01-01T00:00:00.000Z',
      policyReference: 'ret-1',
    },
    metadata: { ccpaNoticeProvided: true },
    preferences: { email: true, sms: false },
  };

  function createApiMock(overrides: Partial<ConsentApi> = {}): ConsentApi {
    return {
      fetchConsent: jest.fn().mockResolvedValue(null),
      upsertConsent: jest.fn().mockResolvedValue(undefined),
      recordAuditTrail: jest.fn().mockResolvedValue(undefined),
      publishDrift: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('reconciles snapshots, increments version, and records drift', async () => {
    const existingRecord: ConsentRecord = {
      ...baseSnapshot,
      canonicalSource: 'crm',
      sources: ['crm'],
      lastSyncedAt: '2024-12-31T00:00:00.000Z',
      version: 3,
      purposes: ['analytics'],
    };

    const api = createApiMock({
      fetchConsent: jest.fn().mockResolvedValue(existingRecord),
    });

    const snapshots: ConsentStateSnapshot[] = [
      baseSnapshot,
      {
        ...baseSnapshot,
        source: 'legacy-crm',
        status: 'denied',
        version: 1,
        lastUpdated: '2025-01-01T09:00:00.000Z',
        preferences: { email: false },
      },
      {
        ...baseSnapshot,
        source: 'edge-cache',
        version: 2,
        lastUpdated: '2025-01-02T11:30:00.000Z',
        preferences: { email: true, push: true },
      },
    ];

    const reconciler = new ConsentReconciler(api, {
      actor: 'unit-test',
      clockSkewToleranceMs: 1000,
    });

    const result = await reconciler.reconcile('consent-1', snapshots);

    expect(api.upsertConsent).toHaveBeenCalledTimes(1);
    expect(api.upsertConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        consentId: 'consent-1',
        version: 4,
        canonicalSource: 'identity-core',
        sources: expect.arrayContaining([
          'identity-core',
          'legacy-crm',
          'edge-cache',
        ]),
        purposes: ['analytics', 'marketing'],
      }),
    );

    const auditEntries = (api.recordAuditTrail as jest.Mock).mock.calls.map(
      (call) => call[0],
    );
    expect(auditEntries.length).toBe(result.auditTrail.length);
    expect(auditEntries[0]).toMatchObject({
      action: 'RECONCILE',
      actor: 'unit-test',
    });
    expect(result.driftFindings.length).toBeGreaterThanOrEqual(1);
    expect(result.updatesRequired).toEqual(
      expect.arrayContaining(['legacy-crm', 'edge-cache']),
    );
    expect(api.publishDrift).toHaveBeenCalledWith(
      'consent-1',
      result.driftFindings as ConsentDriftFinding[],
    );
    expect(result.compliance.isCompliant).toBe(true);
  });

  it('surfaces GDPR and CCPA compliance issues when required fields are missing', async () => {
    const snapshots: ConsentStateSnapshot[] = [
      {
        consentId: 'consent-2',
        source: 'web',
        status: 'denied',
        version: 1,
        lastUpdated: '2025-03-01T08:00:00.000Z',
        jurisdiction: 'GLOBAL',
        dataSubjectId: 'user-2',
      },
    ];

    const api = createApiMock();
    const reconciler = new ConsentReconciler(api);
    const result = await reconciler.reconcile('consent-2', snapshots);

    const issueCodes = result.compliance.issues.map((issue) => issue.code);
    expect(result.compliance.isCompliant).toBe(false);
    expect(issueCodes).toEqual(
      expect.arrayContaining([
        'GDPR_LAWFUL_BASIS_MISSING',
        'GDPR_PURPOSE_REQUIRED',
        'GDPR_RETENTION_UNSPECIFIED',
        'GDPR_PROOF_MISSING',
        'CCPA_NOTICE_REQUIRED',
        'CCPA_DNS_MISSING',
      ]),
    );

    const complianceEntry = (api.recordAuditTrail as jest.Mock).mock.calls
      .map((call) => call[0])
      .find((entry) => entry.action === 'COMPLIANCE_ALERT');
    expect(complianceEntry).toBeDefined();
    expect(complianceEntry?.details?.issues).toHaveLength(
      result.compliance.issues.length,
    );
  });
});

describe('HttpConsentApiClient', () => {
  const sampleRecord: ConsentRecord = {
    consentId: 'consent-3',
    status: 'granted',
    version: 1,
    lastUpdated: '2025-04-01T00:00:00.000Z',
    jurisdiction: 'GDPR',
    dataSubjectId: 'user-3',
    lawfulBasis: 'consent',
    purposes: ['analytics'],
    canonicalSource: 'edge',
    sources: ['edge'],
    lastSyncedAt: '2025-04-01T00:00:00.000Z',
    metadata: { ccpaNoticeProvided: true },
    preferences: { email: true },
  };

  const makeAxiosStub = () => {
    return {
      get: jest.fn(),
      put: jest.fn(),
      post: jest.fn(),
    } as unknown as AxiosInstance;
  };

  it('performs CRUD operations against the consent API', async () => {
    const axiosStub = makeAxiosStub();
    (axiosStub.get as jest.Mock).mockResolvedValue({ data: sampleRecord });
    const client = new HttpConsentApiClient(
      { baseUrl: 'https://privacy.example.com' },
      axiosStub,
    );

    await expect(client.fetchConsent('consent-3')).resolves.toEqual(
      sampleRecord,
    );
    expect(axiosStub.get).toHaveBeenCalledWith('/consents/consent-3');

    await client.upsertConsent(sampleRecord);
    expect(axiosStub.put).toHaveBeenCalledWith(
      '/consents/consent-3',
      sampleRecord,
    );

    const auditEntry = {
      consentId: 'consent-3',
      action: 'RECONCILE' as const,
      timestamp: '2025-04-02T00:00:00.000Z',
      actor: 'tester',
      summary: 'Reconciled',
    };
    await client.recordAuditTrail(auditEntry);
    expect(axiosStub.post).toHaveBeenCalledWith(
      '/consents/consent-3/audit',
      auditEntry,
    );

    const findings: ConsentDriftFinding[] = [
      {
        source: 'edge',
        detectedAt: '2025-04-02T00:00:00.000Z',
        deltas: [{ field: 'status', expected: 'granted', actual: 'denied' }],
      },
    ];
    await client.publishDrift('consent-3', findings);
    expect(axiosStub.post).toHaveBeenCalledWith('/consents/consent-3/drift', {
      findings,
    });
  });

  it('returns null when the API responds with 404', async () => {
    const axiosStub = makeAxiosStub();
    const notFoundError = Object.assign(new Error('Not found'), {
      isAxiosError: true,
      response: { status: 404 },
    });
    (axiosStub.get as jest.Mock).mockRejectedValue(notFoundError);

    const client = new HttpConsentApiClient(
      { baseUrl: 'https://privacy.example.com' },
      axiosStub,
    );
    await expect(client.fetchConsent('missing')).resolves.toBeNull();
  });
});
