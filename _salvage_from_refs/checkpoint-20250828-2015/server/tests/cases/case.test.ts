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

describe('Case Resolvers', () => {
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

  describe('removeCaseItem', () => {
    test('should remove a case item and log a timeline event', async () => {
      const caseId = 'case-123';
      const itemId = 'item-456';
      const itemKind = 'OSINT_DOC';
      const itemRefId = 'ref-789';

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM case_items')) {
          return { rows: [{ id: itemId, case_id: caseId, kind: itemKind, ref_id: itemRefId }] };
        }
        if (sql.includes('DELETE FROM case_items')) {
          return { rowCount: 1 };
        }
        if (sql.includes('INSERT INTO case_timeline')) {
          return { rows: [{}] };
        }
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const result = await (caseResolvers.Mutation as IResolvers['Mutation'])?.removeCaseItem(
        null, // parent
        { caseId, itemId },
        { user: mockUser },
        {} // info
      );

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM case_items WHERE id = $1 AND case_id = $2', [itemId, caseId]);
      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM case_items WHERE id = $1', [itemId]);
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO case_timeline (case_id, event, payload) VALUES ($1, $2, $3)',
        [caseId, 'item.removed', { item_id: itemId, kind: itemKind, ref_id: itemRefId, user_id: mockUser.id }]
      );
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockRelease).toHaveBeenCalled();
    });

    test('should throw an error if item not found', async () => {
      const caseId = 'case-123';
      const itemId = 'item-456';

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM case_items')) {
          return { rows: [] }; // Item not found
        }
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(
        (caseResolvers.Mutation as IResolvers['Mutation'])?.removeCaseItem(
          null,
          { caseId, itemId },
          { user: mockUser },
          {}
        )
      ).rejects.toThrow('Item not found in case');

      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM case_items WHERE id = $1 AND case_id = $2', [itemId, caseId]);
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });

    test('should rollback on error', async () => {
      const caseId = 'case-123';
      const itemId = 'item-456';
      const itemKind = 'OSINT_DOC';
      const itemRefId = 'ref-789';

      mockQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM case_items')) {
          return { rows: [{ id: itemId, case_id: caseId, kind: itemKind, ref_id: itemRefId }] };
        }
        if (sql.includes('DELETE FROM case_items')) {
          throw new Error('Database error'); // Simulate a database error
        }
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(
        (caseResolvers.Mutation as IResolvers['Mutation'])?.removeCaseItem(
          null,
          { caseId, itemId },
          { user: mockUser },
          {}
        )
      ).rejects.toThrow('Database error');

      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM case_items WHERE id = $1', [itemId]);
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });
  });
});
