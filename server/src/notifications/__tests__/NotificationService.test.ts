
import { jest } from '@jest/globals';

jest.mock('../../db/pg.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../realtime/socket.js', () => ({
  getIO: jest.fn().mockReturnValue({
    of: jest.fn().mockReturnValue({
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    }),
  }),
}));

import { NotificationService } from '../NotificationService.js';
// @ts-ignore
import { pool } from '../../db/pg.js';

describe('NotificationService', () => {
  let service: NotificationService;
  const mockQuery = pool.query as jest.Mock<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
  });

  it('should list notifications with tenant isolation', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'n1',
          tenant_id: 't1',
          user_id: 'u1',
          type: 'SYSTEM',
          payload: { message: 'hello' },
          read_at: null,
          created_at: new Date(),
        },
      ],
    });

    const result = await service.listNotifications('t1', 'u1', false);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE tenant_id = $1 AND user_id = $2'),
      expect.arrayContaining(['t1', 'u1'])
    );
    expect(result).toHaveLength(1);
    expect(result[0].tenantId).toBe('t1');
  });

  it('should create notification if preference allows', async () => {
    // Mock preference: enabled
    mockQuery.mockImplementation((sql: any) => {
      const sqlStr = typeof sql === 'string' ? sql : sql.text;
      if (sqlStr.includes('SELECT * FROM notification_type_preferences')) {
        return Promise.resolve({
          rows: [{ user_id: 'u1', tenant_id: 't1', type: 'MENTION', enabled: true }]
        });
      }
      if (sqlStr.includes('INSERT INTO notifications')) {
        return Promise.resolve({
          rows: [{ id: 'new_id', tenant_id: 't1', user_id: 'u1', type: 'MENTION', payload: {}, created_at: new Date() }]
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await service.createNotification({
      tenantId: 't1',
      userId: 'u1',
      type: 'MENTION',
      payload: { message: 'hi' }
    });

    expect(mockQuery).toHaveBeenCalledTimes(2); // 1 check pref, 1 insert
  });

  it('should NOT create notification if preference disabled', async () => {
    // Mock preference: disabled
    mockQuery.mockImplementation((sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.text;
      if (sqlStr.includes('SELECT * FROM notification_type_preferences')) {
        return Promise.resolve({
          rows: [{ user_id: 'u1', tenant_id: 't1', type: 'MENTION', enabled: false }]
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await service.createNotification({
      tenantId: 't1',
      userId: 'u1',
      type: 'MENTION',
      payload: { message: 'hi' }
    });

    expect(result).toBeNull();
    // Should verify insert was NOT called
    // We expect only 1 call (the preference check)
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const firstCallArg = mockQuery.mock.calls[0][0];
    const sqlStr = typeof firstCallArg === 'string' ? firstCallArg : (firstCallArg as any).text;
    expect(sqlStr).toContain('SELECT * FROM notification_type_preferences');
  });

  it('producer should handle comment mentions', async () => {
      const createSpy = jest.spyOn(service, 'createNotification');
      // Mock createNotification to do nothing but resolve
      createSpy.mockResolvedValue({} as any);

      await service.handleCommentMention('t1', 'author1', 'Hello @user2', ['user2'], 'c1');

      expect(createSpy).toHaveBeenCalledWith({
          tenantId: 't1',
          userId: 'user2',
          type: 'MENTION',
          payload: expect.objectContaining({
              data: expect.objectContaining({ commentId: 'c1' })
          })
      });
  });

  it('producer should not notify author', async () => {
      const createSpy = jest.spyOn(service, 'createNotification');
      createSpy.mockResolvedValue({} as any);

      await service.handleCommentMention('t1', 'user1', 'Hello @user1', ['user1'], 'c1');

      expect(createSpy).not.toHaveBeenCalled();
  });
});
