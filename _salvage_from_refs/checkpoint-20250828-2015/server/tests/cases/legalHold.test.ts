import { getPostgresPool } from '../../src/db/postgres';
import { IResolvers } from '@graphql-tools/utils';
import caseResolvers from '../../src/graphql/resolvers/case';

// Mock the getPostgresPool to control database interactions
jest.mock('../../src/db/postgres', () => ({
  getPostgresPool: jest.fn(() => ({
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  })),
}));

describe('Legal Hold Resolvers', () => {
  let mockQuery: jest.Mock;
  let mockRelease: jest.Mock;
  let mockUser: any;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    (getPostgresPool as jest.Mock).mockReturnValue({
      connect: jest.fn(() => ({
        query: mockQuery,
        release: mockRelease,
      })),
    });
    mockUser = { id: 'test-user', tenant_id: 'test-tenant' };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLegalHold', () => {
    test('should create a legal hold', async () => {
      const name = 'Test Legal Hold';
      const newHoldId = 'hold-123';

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO legal_holds')) {
          return { rows: [{ id: newHoldId, tenant_id: mockUser.tenant_id, name, created_by: mockUser.id }] };
        }
        return { rows: [] };
      });

      const result = await (caseResolvers.Mutation as IResolvers['Mutation'])?.createLegalHold(
        null,
        { name },
        { user: mockUser },
        {}
      );

      expect(result).toEqual({ id: newHoldId, tenant_id: mockUser.tenant_id, name, created_by: mockUser.id });
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO legal_holds (tenant_id, name, created_by) VALUES ($1, $2, $3) RETURNING *',
        [mockUser.tenant_id, name, mockUser.id]
      );
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('addToLegalHold', () => {
    test('should add an item to a legal hold', async () => {
      const holdId = 'hold-123';
      const kind = 'DOC';
      const refId = 'doc-456';

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO legal_hold_items')) {
          return { rows: [{ hold_id: holdId, kind, ref_id: refId }] };
        }
        return { rows: [] };
      });

      const result = await (caseResolvers.Mutation as IResolvers['Mutation'])?.addToLegalHold(
        null,
        { holdId, kind, refId },
        { user: mockUser },
        {}
      );

      expect(result).toEqual({ hold_id: holdId, kind, ref_id: refId });
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO legal_hold_items (hold_id, kind, ref_id) VALUES ($1, $2, $3) RETURNING *',
        [holdId, kind, refId]
      );
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('removeFromLegalHold', () => {
    test('should remove an item from a legal hold', async () => {
      const holdId = 'hold-123';
      const kind = 'DOC';
      const refId = 'doc-456';

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('DELETE FROM legal_hold_items')) {
          return { rowCount: 1 };
        }
        return { rows: [] };
      });

      const result = await (caseResolvers.Mutation as IResolvers['Mutation'])?.removeFromLegalHold(
        null,
        { holdId, kind, refId },
        { user: mockUser },
        {}
      );

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM legal_hold_items WHERE hold_id = $1 AND kind = $2 AND ref_id = $3',
        [holdId, kind, refId]
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    test('should return false if item not found for removal', async () => {
      const holdId = 'hold-123';
      const kind = 'DOC';
      const refId = 'doc-456';

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('DELETE FROM legal_hold_items')) {
          return { rowCount: 0 };
        }
        return { rows: [] };
      });

      const result = await (caseResolvers.Mutation as IResolvers['Mutation'])?.removeFromLegalHold(
        null,
        { holdId, kind, refId },
        { user: mockUser },
        {}
      );

      expect(result).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM legal_hold_items WHERE hold_id = $1 AND kind = $2 AND ref_id = $3',
        [holdId, kind, refId]
      );
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('legalHolds query', () => {
    test('should return a list of legal holds for the tenant', async () => {
      const mockHolds = [
        { id: 'hold-1', tenant_id: mockUser.tenant_id, name: 'Hold 1', created_by: 'user1' },
        { id: 'hold-2', tenant_id: mockUser.tenant_id, name: 'Hold 2', created_by: 'user2' },
      ];

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM legal_holds')) {
          return { rows: mockHolds };
        }
        return { rows: [] };
      });

      const result = await (caseResolvers.Query as IResolvers['Query'])?.legalHolds(
        null,
        { search: null, after: null, limit: 25 },
        { user: mockUser },
        {}
      );

      expect(result).toEqual(mockHolds);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM legal_holds WHERE tenant_id = $1 ORDER BY id LIMIT $2',
        [mockUser.tenant_id, 25]
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    test('should filter legal holds by search term', async () => {
      const mockHolds = [
        { id: 'hold-1', tenant_id: mockUser.tenant_id, name: 'Searchable Hold', created_by: 'user1' },
      ];

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM legal_holds') && sql.includes('ILIKE')) {
          return { rows: mockHolds };
        }
        return { rows: [] };
      });

      const result = await (caseResolvers.Query as IResolvers['Query'])?.legalHolds(
        null,
        { search: 'Searchable', after: null, limit: 25 },
        { user: mockUser },
        {}
      );

      expect(result).toEqual(mockHolds);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM legal_holds WHERE tenant_id = $1 AND name ILIKE $2 ORDER BY id LIMIT $3',
        [mockUser.tenant_id, '%Searchable%', 25]
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    test('should paginate legal holds using after cursor', async () => {
      const mockHolds = [
        { id: 'hold-3', tenant_id: mockUser.tenant_id, name: 'Hold 3', created_by: 'user3' },
      ];

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM legal_holds') && sql.includes('id >')) {
          return { rows: mockHolds };
        }
        return { rows: [] };
      });

      const result = await (caseResolvers.Query as IResolvers['Query'])?.legalHolds(
        null,
        { search: null, after: 'hold-2', limit: 10 },
        { user: mockUser },
        {}
      );

      expect(result).toEqual(mockHolds);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM legal_holds WHERE tenant_id = $1 AND id > $2 ORDER BY id LIMIT $3',
        [mockUser.tenant_id, 'hold-2', 10]
      );
      expect(mockRelease).toHaveBeenCalled();
    });
  });
});
