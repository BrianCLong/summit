import { UserActivityAnalyticsService } from '../UserActivityAnalyticsService';

describe('UserActivityAnalyticsService', () => {
  const mockPg = {
    readMany: jest.fn(),
  } as unknown as { readMany: jest.Mock };

  beforeEach(() => {
    mockPg.readMany.mockReset();
  });

  it('builds summary combining login and query activity', async () => {
    const loginRows = [
      {
        activity_date: '2025-01-01T00:00:00.000Z',
        login_count: 3,
        user_ids: ['user-1', 'user-2'],
      },
    ];
    const queryRows = [
      {
        activity_date: '2025-01-02T00:00:00.000Z',
        query_count: 5,
        user_ids: ['user-2', 'user-3'],
        created_by: 'user-2',
      },
    ];
    const topLoginRows = [
      { user_id: 'user-1', login_count: 3, last_active: '2025-01-02T10:00:00Z' },
      { user_id: 'user-2', login_count: 1, last_active: '2025-01-01T05:00:00Z' },
    ];
    const topQueryRows = [
      { user_id: 'user-2', query_count: 5, last_active: '2025-01-03T00:00:00Z' },
      { user_id: 'user-3', query_count: 2, last_active: '2025-01-02T04:00:00Z' },
    ];

    mockPg.readMany
      .mockResolvedValueOnce(loginRows)
      .mockResolvedValueOnce(queryRows)
      .mockResolvedValueOnce(topLoginRows)
      .mockResolvedValueOnce(topQueryRows);

    const service = new UserActivityAnalyticsService(mockPg as any);
    const summary = await service.getSummary({
      tenantId: 'tenant-1',
      rangeStart: '2025-01-01T00:00:00.000Z',
      rangeEnd: '2025-01-05T00:00:00.000Z',
    });

    expect(summary.totalLogins).toBe(3);
    expect(summary.totalQueries).toBe(5);
    expect(summary.uniqueUsers).toBe(3);
    expect(summary.activeUsersByDay).toEqual([
      { date: '2025-01-01T00:00:00.000Z', loginCount: 3, queryCount: 0 },
      { date: '2025-01-02T00:00:00.000Z', loginCount: 0, queryCount: 5 },
    ]);
    expect(summary.topUsers[0]).toEqual({
      userId: 'user-2',
      loginCount: 1,
      queryCount: 5,
      lastActiveAt: '2025-01-03T00:00:00.000Z',
    });
    expect(summary.topUsers).toHaveLength(3);
  });

  it('falls back to alternate audit schema when primary query fails', async () => {
    const loginRows = [
      {
        activity_date: '2025-01-01T00:00:00.000Z',
        login_count: 1,
        user_ids: ['user-1'],
      },
    ];
    const queryRows: any[] = [];
    const topLoginRows: any[] = [];
    const topQueryRows: any[] = [];

    mockPg.readMany
      .mockRejectedValueOnce(new Error('column tenant_id does not exist'))
      .mockResolvedValueOnce(loginRows)
      .mockResolvedValueOnce(queryRows)
      .mockResolvedValueOnce(topLoginRows)
      .mockResolvedValueOnce(topQueryRows);

    const service = new UserActivityAnalyticsService(mockPg as any);
    const summary = await service.getSummary({
      tenantId: null,
      rangeStart: '2025-01-01T00:00:00.000Z',
      rangeEnd: '2025-01-02T00:00:00.000Z',
    });

    expect(summary.totalLogins).toBe(1);
    expect(mockPg.readMany).toHaveBeenCalledTimes(5);
  });

  it('returns recent events with normalized metadata', async () => {
    const eventRows = [
      {
        event_time: new Date('2025-01-04T12:00:00Z'),
        event_type: 'user.login',
        actor_id: 'user-1',
        metadata: JSON.stringify({ ip: '1.2.3.4' }),
      },
      {
        event_time: '2025-01-04T13:00:00Z',
        event_type: 'query.executed',
        actor_id: null,
        metadata: { query: 'MATCH (n) RETURN n' },
      },
    ];

    mockPg.readMany.mockResolvedValueOnce(eventRows);

    const service = new UserActivityAnalyticsService(mockPg as any);
    const events = await service.getRecentActivity('tenant-1', '2025-01-01T00:00:00.000Z', '2025-01-05T00:00:00.000Z', 10);

    expect(events).toEqual([
      {
        timestamp: '2025-01-04T12:00:00.000Z',
        type: 'user.login',
        userId: 'user-1',
        metadata: { ip: '1.2.3.4' },
      },
      {
        timestamp: '2025-01-04T13:00:00.000Z',
        type: 'query.executed',
        userId: null,
        metadata: { query: 'MATCH (n) RETURN n' },
      },
    ]);
  });
});
