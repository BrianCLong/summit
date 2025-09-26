import jwt from 'jsonwebtoken';
import config from '../../config/index.js';

const redisStore = new Map<string, string>();

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(async () => ({ query: mockQuery, release: mockRelease }));

const mockPool = { connect: mockConnect };

const mockRedis = {
  get: jest.fn(async (key: string) => (redisStore.has(key) ? redisStore.get(key)! : null)),
  set: jest.fn(async (key: string, value: string, mode?: string, ttl?: number) => {
    if (typeof mode === 'string' && mode.toUpperCase() === 'EX' && typeof ttl === 'number') {
      // TTL ignored in tests but we keep signature compatibility
    }
    redisStore.set(key, value);
    return 'OK';
  }),
  del: jest.fn(async (key: string) => {
    const existed = redisStore.delete(key);
    return existed ? 1 : 0;
  }),
};

describe('AuthService caching', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    redisStore.clear();
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset().mockImplementation(async () => ({ query: mockQuery, release: mockRelease }));
    (mockRedis.get as jest.Mock).mockClear();
    (mockRedis.set as jest.Mock).mockClear();
    (mockRedis.del as jest.Mock).mockClear();
  });

  function setupUserRow() {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users WHERE id')) {
        return {
          rows: [
            {
              id: 'user-1',
              email: 'user@example.com',
              username: 'user1',
              password_hash: 'hash',
              first_name: 'Ada',
              last_name: 'Lovelace',
              role: 'ANALYST',
              is_active: true,
              last_login: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });
  }

  it('memoises verifyToken responses in Redis', async () => {
    jest.mock('../../config/database.js', () => ({
      __esModule: true,
      getPostgresPool: () => mockPool,
      getRedisClient: () => mockRedis,
    }));

    setupUserRow();

    const serviceModule = await import('../AuthService.js');
    const service = new serviceModule.default();

    const token = jwt.sign({ userId: 'user-1', email: 'user@example.com', role: 'ANALYST' }, config.jwt.secret);

    const first = await service.verifyToken(token);

    expect(first?.permissions).toContain('investigation:read');
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledTimes(1);

    mockQuery.mockClear();

    const second = await service.verifyToken(token);

    expect(second).toEqual(first);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockRedis.get).toHaveBeenCalled();
  });
});
