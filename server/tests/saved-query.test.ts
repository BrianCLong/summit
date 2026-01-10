import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';

let SavedQueryService: typeof import('../src/services/SavedQueryService.js').SavedQueryService;

const mockQuery = jest.fn() as jest.Mock;
const mockRelease = jest.fn();
const mockConnect = jest.fn() as jest.Mock;
const mockClient = { query: mockQuery, release: mockRelease };
const mockPool = {
  connect: mockConnect,
  query: mockQuery,
};

beforeAll(async () => {
  jest.resetModules();
  await jest.unstable_mockModule('../src/config/database', () => ({
    getPostgresPool: jest.fn(() => mockPool),
  }));

  ({ SavedQueryService } = await import('../src/services/SavedQueryService.js'));
  await import('../src/config/database');
});

describe('SavedQueryService', () => {
  let service: import('../src/services/SavedQueryService.js').SavedQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    (SavedQueryService as any).instance = undefined;
    mockConnect.mockImplementation(async () => mockClient as any);
    service = SavedQueryService.getInstance();
    (service as any).pool = mockPool;
  });

  it('should create a saved query', async () => {
    const input = {
      name: 'Test Query',
      cypher: 'MATCH (n) RETURN n',
      parameters: {},
      tags: ['test'],
      scope: 'private' as const,
    };
    const userId = 'user-1';
    const tenantId = 'tenant-1';

    mockQuery.mockImplementationOnce(async () => ({ rows: [{ ...input, id: '123' }] }) as any);

    const result = await service.create(input, userId, tenantId);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO saved_queries'),
      expect.arrayContaining(['Test Query', 'user-1', 'tenant-1'])
    );
    expect(result).toHaveProperty('id', '123');
  });

  it('should list saved queries', async () => {
    mockQuery.mockImplementationOnce(async () => ({ rows: [] }) as any);
    await service.list('user-1', 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM saved_queries'),
      ['tenant-1', 'user-1']
    );
  });
});
