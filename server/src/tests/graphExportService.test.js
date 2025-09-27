jest.mock('../config/database', () => ({
  getNeo4jDriver: jest.fn(),
  getPostgresPool: jest.fn(),
}));

jest.mock('neo4j-driver', () => ({
  session: { READ: 'READ' },
  isInt: (value) => Boolean(value && value.__isNeo4jInt),
}));

const { getNeo4jDriver, getPostgresPool } = require('../config/database');
const GraphExportService = require('../services/GraphExportService');

describe('GraphExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exports Neo4j results as JSON payload', async () => {
    const mockSession = {
      run: jest.fn().mockResolvedValue({
        records: [
          {
            toObject: () => ({
              id: { __isNeo4jInt: true, toNumber: () => 42 },
              label: 'Node 42',
            }),
          },
        ],
      }),
      close: jest.fn(),
    };

    getNeo4jDriver.mockReturnValue({
      session: jest.fn(() => mockSession),
    });

    const result = await GraphExportService.exportGraphData({
      query: 'MATCH (n) RETURN n',
      format: 'JSON',
      dataSource: 'NEO4J',
      user: { id: 'user-1' },
      traceId: 'trace-123',
    });

    const decoded = JSON.parse(Buffer.from(result.content, 'base64').toString('utf-8'));

    expect(result.contentType).toBe('application/json');
    expect(result.recordCount).toBe(1);
    expect(decoded).toEqual([
      {
        id: 42,
        label: 'Node 42',
      },
    ]);
    expect(mockSession.run).toHaveBeenCalledWith('MATCH (n) RETURN n', {});
    expect(mockSession.close).toHaveBeenCalled();
  });

  test('exports PostgreSQL results as CSV payload', async () => {
    const mockQuery = jest.fn().mockResolvedValue({
      rows: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    });

    getPostgresPool.mockReturnValue({
      query: mockQuery,
    });

    const result = await GraphExportService.exportGraphData({
      query: 'SELECT id, name FROM people',
      format: 'CSV',
      dataSource: 'POSTGRES',
      user: { id: 'user-2' },
      traceId: 'trace-456',
    });

    const decoded = Buffer.from(result.content, 'base64').toString('utf-8');

    expect(result.contentType).toBe('text/csv');
    expect(result.recordCount).toBe(2);
    expect(decoded).toContain('id,name');
    expect(decoded).toContain('1,Alice');
    expect(decoded).toContain('2,Bob');
    expect(mockQuery).toHaveBeenCalledWith('SELECT id, name FROM people', []);
  });

  test('rejects non read-only Cypher queries', async () => {
    await expect(
      GraphExportService.exportGraphData({
        query: 'MATCH (n) CREATE (m:Entity {id: n.id}) RETURN m',
        format: 'JSON',
        dataSource: 'NEO4J',
      }),
    ).rejects.toThrow('Only read-only Cypher queries are allowed for exports');
  });

  test('rejects non read-only SQL queries', async () => {
    await expect(
      GraphExportService.exportGraphData({
        query: 'WITH source AS (SELECT 1) INSERT INTO users(id) SELECT * FROM source',
        format: 'CSV',
        dataSource: 'POSTGRES',
      }),
    ).rejects.toThrow('Only read-only SQL queries are allowed for exports');
  });
});
