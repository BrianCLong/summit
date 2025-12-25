
import { SavedQueryService } from '../src/services/SavedQueryService';
import { getPostgresPool } from '../src/config/database';

// Mock the dependencies
jest.mock('../src/config/database', () => {
    const mQuery = jest.fn();
    const mClient = { query: mQuery, release: jest.fn() };
    const mPool = {
        connect: jest.fn().mockResolvedValue(mClient),
        query: mQuery
    };
    return { getPostgresPool: jest.fn(() => mPool) };
});

describe('SavedQueryService', () => {
    let service: SavedQueryService;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPool = getPostgresPool();
        service = SavedQueryService.getInstance();
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

        mockPool.query.mockResolvedValueOnce({ rows: [{ ...input, id: '123' }] });

        const result = await service.create(input, userId, tenantId);

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO saved_queries'),
            expect.arrayContaining(['Test Query', 'user-1', 'tenant-1'])
        );
        expect(result).toHaveProperty('id', '123');
    });

    it('should list saved queries', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        await service.list('user-1', 'tenant-1');
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT * FROM saved_queries'),
            ['tenant-1', 'user-1']
        );
    });
});
