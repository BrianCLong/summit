import { jest } from '@jest/globals';
import { getPostgresPool } from '../../db/postgres.js';
import { Permission, Role } from '../../services/MVP1RBACService.js';
import { TrustCenterService } from '../trust-center-service.js';

jest.mock('../../db/postgres.js', () => ({
  getPostgresPool: jest.fn(),
}));

describe('TrustCenterService export hardening', () => {
  const mockGetPostgresPool = getPostgresPool as jest.MockedFunction<
    typeof getPostgresPool
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildPool(queryResults: any[]): { query: jest.Mock } {
    const query = jest.fn();
    queryResults.forEach((result) => query.mockResolvedValueOnce(result));
    return { query } as any;
  }

  it('applies tenant-scoped attribute filtering for non-admin export actors', async () => {
    const pool = buildPool([
      { rows: [{ decision: 'allow', policy: 'p1', user_id: 'user-1', email: 'user@example.com', metadata: { internal: true } }] },
      {
        rows: [
          {
            created_at: '2024-01-01T00:00:00Z',
            run_id: 'run-1',
            selected_model: 'mistral',
            candidates: '[]',
            ip: '10.0.0.5',
            metadata: { route: 'A' },
          },
        ],
      },
      { rows: [{ created_at: '2024-01-01T00:00:00Z', type: 'log', hash: 'abc', size_bytes: 10, source: 'sensor', metadata: { pii: true } }] },
      { rows: [{ timestamp: '2024-01-01T00:00:00Z', model: 'mistral', latency_ms: 5, tokens_in: 1, tokens_out: 2, cost_usd: 0.01 }] },
    ]);

    mockGetPostgresPool.mockReturnValue(pool as any);

    const service = new TrustCenterService();
    const sections = await (service as any).gatherAuditSections(
      'tenant-1',
      '2024-01-01',
      '2024-01-02',
      true,
      { role: Role.VIEWER, permissions: [Permission.AUDIT_READ], tenantId: 'tenant-1' },
    );

    expect(sections.policyDecisions[0].email).toBeUndefined();
    expect(sections.policyDecisions[0].metadata).toBeUndefined();
    expect(sections.routerDecisions[0].ip).toBeUndefined();
    expect(sections.evidenceArtifacts[0].metadata).toBeUndefined();
    expect(pool.query).toHaveBeenCalledTimes(4);
  });

  it('retains privileged context while redacting sensitive fields for admins', async () => {
    const pool = buildPool([
      { rows: [{ decision: 'allow', policy: 'p2', user_id: 'admin', metadata: { policy: 'strict' } }] },
      {
        rows: [
          {
            created_at: '2024-01-02T00:00:00Z',
            run_id: 'run-2',
            selected_model: 'gpt',
            candidates: '[]',
            ip: '10.0.0.8',
            metadata: { route: 'B' },
          },
        ],
      },
      { rows: [{ created_at: '2024-01-02T00:00:00Z', type: 'attestation', hash: 'def', size_bytes: 25, source: 'pipeline', metadata: { region: 'us' } }] },
      { rows: [{ timestamp: '2024-01-02T00:00:00Z', model: 'gpt', latency_ms: 10, tokens_in: 5, tokens_out: 6, cost_usd: 0.05 }] },
    ]);

    mockGetPostgresPool.mockReturnValue(pool as any);

    const service = new TrustCenterService();
    const sections = await (service as any).gatherAuditSections(
      'tenant-2',
      '2024-01-01',
      '2024-01-03',
      true,
      {
        role: Role.ADMIN,
        permissions: [Permission.AUDIT_EXPORT],
        tenantId: 'tenant-2',
      },
    );

    expect(sections.policyDecisions[0].metadata).toEqual({ policy: 'strict' });
    expect(sections.routerDecisions[0].metadata).toEqual({ route: 'B' });
    expect(sections.routerDecisions[0].ip).toBe('[REDACTED]');
    expect(sections.evidenceArtifacts[0].metadata).toEqual({ region: 'us' });
    expect(pool.query).toHaveBeenCalledTimes(4);
  });

  it('treats upper-case admin roles as privileged actors', async () => {
    const pool = buildPool([
      { rows: [{ decision: 'allow', policy: 'p3', user_id: 'admin', metadata: { scope: 'all' } }] },
      {
        rows: [
          {
            created_at: '2024-01-03T00:00:00Z',
            run_id: 'run-3',
            selected_model: 'claude',
            candidates: '[]',
            ip: '10.0.0.9',
            metadata: { route: 'C' },
          },
        ],
      },
      { rows: [{ created_at: '2024-01-03T00:00:00Z', type: 'attestation', hash: 'ghi', size_bytes: 15, source: 'pipeline', metadata: { region: 'eu' } }] },
      { rows: [{ timestamp: '2024-01-03T00:00:00Z', model: 'claude', latency_ms: 8, tokens_in: 3, tokens_out: 4, cost_usd: 0.02 }] },
    ]);

    mockGetPostgresPool.mockReturnValue(pool as any);

    const service = new TrustCenterService();
    const sections = await (service as any).gatherAuditSections(
      'tenant-3',
      '2024-01-02',
      '2024-01-04',
      true,
      { role: 'ADMIN', tenantId: 'tenant-3' },
    );

    expect(sections.policyDecisions[0].metadata).toEqual({ scope: 'all' });
    expect(sections.routerDecisions[0].metadata).toEqual({ route: 'C' });
    expect(pool.query).toHaveBeenCalledTimes(4);
  });
});

