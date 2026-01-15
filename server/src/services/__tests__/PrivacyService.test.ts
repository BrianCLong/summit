import { jest } from '@jest/globals';

const requests = new Map<string, Record<string, unknown>>();
const evidences = new Map<string, Record<string, unknown>>();

const pool = {
  query: jest.fn(async (text: string, params: unknown[] = []) => {
    const query = text.replace(/\s+/g, ' ').trim().toLowerCase();

    if (query.startsWith('insert into privacy_dsar_requests')) {
      const [
        id,
        tenantId,
        userId,
        subjectId,
        type,
        status,
        details,
        submittedAt,
        deadline,
      ] = params as [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        Date,
        Date,
      ];
      requests.set(id, {
        id,
        tenant_id: tenantId,
        user_id: userId,
        subject_id: subjectId,
        type,
        status,
        details: typeof details === 'string' ? JSON.parse(details) : details,
        submitted_at: submittedAt,
        deadline,
        completed_at: undefined,
        evidence_id: undefined,
        rejection_reason: undefined,
      });
      return { rows: [] };
    }

    if (query.startsWith('select * from privacy_dsar_requests where id')) {
      const [id] = params as [string];
      const row = requests.get(id);
      return { rows: row ? [row] : [] };
    }

    if (query.startsWith('select * from privacy_dsar_requests where tenant_id')) {
      const [tenantId] = params as [string];
      const rows = Array.from(requests.values()).filter(
        (row) => row.tenant_id === tenantId,
      );
      return { rows };
    }

    if (query.startsWith('update privacy_dsar_requests set status')) {
      const [id, status, ...rest] = params as [string, string, ...unknown[]];
      const row = requests.get(id);
      if (row) {
        row.status = status;
        let idx = 0;
        if (query.includes('completed_at')) {
          row.completed_at = rest[idx++];
        }
        if (query.includes('evidence_id')) {
          row.evidence_id = rest[idx++];
        }
        if (query.includes('rejection_reason')) {
          row.rejection_reason = rest[idx++];
        }
      }
      return { rows: [] };
    }

    if (query.startsWith('insert into privacy_evidence')) {
      const [id, requestId, summary, actions, generatedAt] = params as [
        string,
        string,
        string,
        string,
        Date,
      ];
      evidences.set(requestId, {
        id,
        request_id: requestId,
        summary,
        actions: typeof actions === 'string' ? JSON.parse(actions) : actions,
        generated_at: generatedAt,
      });
      return { rows: [] };
    }

    if (query.startsWith('select * from privacy_evidence where request_id')) {
      const [requestId] = params as [string];
      const row = evidences.get(requestId);
      return { rows: row ? [row] : [] };
    }

    return { rows: [] };
  }),
};

const ledgerMock = {
  appendEntry: jest.fn(async () => ({ id: 'mock-entry-id' })),
};

jest.unstable_mockModule('../../db/pg.js', () => ({ pool }));
jest.unstable_mockModule('../../provenance/ledger.js', () => ({
  provenanceLedger: ledgerMock,
}));

let PrivacyService: typeof import('../PrivacyService.js').PrivacyService;
let DSARType: typeof import('../PrivacyService.js').DSARType;
let DSARStatus: typeof import('../PrivacyService.js').DSARStatus;
let provenanceLedger: typeof import('../../provenance/ledger.js').provenanceLedger;

beforeAll(async () => {
  ({ PrivacyService, DSARType, DSARStatus } = await import('../PrivacyService.js'));
  ({ provenanceLedger } = await import('../../provenance/ledger.js'));
});

describe('PrivacyService', () => {
  let privacyService: ReturnType<typeof PrivacyService.getInstance>;

  beforeEach(() => {
    privacyService = PrivacyService.getInstance();
    jest.clearAllMocks();
    requests.clear();
    evidences.clear();
  });

  describe('submitRequest', () => {
    it('should successfully submit a DSAR request', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const type = DSARType.ACCESS;

      const request = await privacyService.submitRequest(tenantId, userId, type);

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.tenantId).toBe(tenantId);
      expect(request.userId).toBe(userId);
      expect(request.type).toBe(type);
      expect(request.status).not.toBe(DSARStatus.FAILED);

      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          actionType: 'PRIVACY_DSAR_SUBMITTED',
          resourceType: 'dsar_request',
          resourceId: request.id,
        }),
      );
    });
  });

  describe('verifyRequest', () => {
    it('should transition request to PROCESSING and then COMPLETED after verification', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-2';
      const type = DSARType.EXPORT;

      const request = await privacyService.submitRequest(tenantId, userId, type);
      const requestId = request.id;

      await new Promise((resolve) => setTimeout(resolve, 200));

      const updatedRequest = await privacyService.getRequestStatus(requestId);
      expect([DSARStatus.PROCESSING, DSARStatus.COMPLETED]).toContain(
        updatedRequest?.status,
      );

      if (updatedRequest?.status === DSARStatus.COMPLETED) {
        expect(updatedRequest.evidenceId).toBeDefined();
      }
    });
  });

  describe('getEvidence', () => {
    it('should return evidence for a completed request', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-3';
      const type = DSARType.EXPORT;

      const request = await privacyService.submitRequest(tenantId, userId, type);

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const evidence = await privacyService.getEvidence(request.id);

      expect(evidence).toBeDefined();
      expect(evidence?.requestId).toBe(request.id);
      expect(evidence?.actions.length).toBeGreaterThan(0);
    });
  });
});
