import { jest } from '@jest/globals';

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: jest.fn(),
}));

const { getPostgresPool } = await import('../../config/database.js');
const { fetchAuditLogs, serializeAuditLogs, encodeCursor } = await import('../../audit/export.js');

describe('audit log export utilities', () => {
  beforeEach(() => {
    (getPostgresPool as jest.Mock).mockReset();
  });

  it('serializes records to JSON', () => {
    const json = serializeAuditLogs(
      [
        {
          id: '1',
          userId: 'user-1',
          action: 'LOGIN',
          resourceType: 'SESSION',
          resourceId: null,
          details: { ip: '127.0.0.1' },
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      'JSON',
    );
    expect(json).toBe(
      '[{"id":"1","userId":"user-1","action":"LOGIN","resourceType":"SESSION","resourceId":null,"details":{"ip":"127.0.0.1"},"ipAddress":"127.0.0.1","userAgent":"jest","createdAt":"2024-01-01T00:00:00.000Z"}]',
    );
  });

  it('serializes records to CSV with escaping', () => {
    const csv = serializeAuditLogs(
      [
        {
          id: '1',
          userId: 'user-1',
          action: 'UPDATE',
          resourceType: 'ENTITY',
          resourceId: 'abc',
          details: { reason: 'test, value' },
          ipAddress: '10.0.0.5',
          userAgent: 'unit-test',
          createdAt: '2024-02-02T00:00:00.000Z',
        },
      ],
      'CSV',
    );
    expect(csv).toBe(
      'id,userId,action,resourceType,resourceId,ipAddress,userAgent,createdAt,details\n1,user-1,UPDATE,ENTITY,abc,10.0.0.5,unit-test,2024-02-02T00:00:00.000Z,"{""reason"":""test, value""}"',
    );
  });

  it('fetches audit logs with pagination and filters', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'log-1',
            userId: 'user-1',
            action: 'LOGIN',
            resourceType: 'SESSION',
            resourceId: null,
            details: { ip: '127.0.0.1' },
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
            createdAt: new Date('2024-03-01T12:00:00Z'),
          },
        ],
      });

    (getPostgresPool as jest.Mock).mockReturnValue({ query });

    const result = await fetchAuditLogs({ actions: ['LOGIN'] }, { limit: 25 });

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain('COUNT(*)');
    expect(query.mock.calls[1][0]).toContain('SELECT');
    expect(result.records).toHaveLength(1);
    expect(result.records[0].createdAt).toBe('2024-03-01T12:00:00.000Z');
    expect(result.hasNextPage).toBe(false);
    expect(result.totalCount).toBe(2);
    expect(result.nextCursor).toBeNull();
    expect(result.limit).toBe(25);

    const cursor = encodeCursor(result.records[0]);
    expect(typeof cursor).toBe('string');
  });
});
