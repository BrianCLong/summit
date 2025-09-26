import { jest } from '@jest/globals';

type AuditLogRecord = {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

jest.unstable_mockModule('../src/audit/export.js', () => ({
  fetchAuditLogs: jest.fn(),
  serializeAuditLogs: jest.fn(),
}));

const { fetchAuditLogs, serializeAuditLogs } = await import('../src/audit/export.js');
const { auditExportResolvers } = await import('../src/graphql/resolvers/audit-export.js');

describe('exportAuditLogs resolver', () => {
  beforeEach(() => {
    (fetchAuditLogs as jest.Mock).mockReset();
    (serializeAuditLogs as jest.Mock).mockReset();
  });

  it('enforces RBAC for unauthorized roles', async () => {
    await expect(
      auditExportResolvers.Query.exportAuditLogs(
        {},
        { format: 'JSON' as const },
        { user: { id: 'user-1', role: 'analyst' } },
      ),
    ).rejects.toThrow('Access denied');
  });

  it('returns serialized export payload for authorized user', async () => {
    const records: AuditLogRecord[] = [
      {
        id: 'log-1',
        userId: 'user-1',
        action: 'LOGIN',
        resourceType: 'SESSION',
        resourceId: null,
        details: null,
        ipAddress: null,
        userAgent: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    (fetchAuditLogs as jest.Mock).mockResolvedValue({
      records,
      hasNextPage: true,
      nextCursor: 'cursor-1',
      totalCount: 42,
      limit: 500,
    });
    (serializeAuditLogs as jest.Mock).mockReturnValue('serialized-data');

    const result = await auditExportResolvers.Query.exportAuditLogs(
      {},
      { format: 'CSV', pagination: { limit: 500 } },
      { user: { id: 'sec-1', role: 'SECURITY' } },
    );

    expect(fetchAuditLogs).toHaveBeenCalledWith(undefined, { limit: 500 });
    expect(serializeAuditLogs).toHaveBeenCalledWith(records, 'CSV');
    expect(result).toEqual({
      format: 'CSV',
      content: 'serialized-data',
      records,
      pageInfo: {
        hasNextPage: true,
        nextCursor: 'cursor-1',
        totalCount: 42,
        limit: 500,
      },
    });
  });
});
