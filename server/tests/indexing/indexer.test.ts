import { Indexer } from '../../src/indexing/indexer';
import { ElasticsearchService } from '../../src/search/elasticsearch';
import { Pool } from 'pg';

jest.mock('pg'); // Uses server/__mocks__/pg.ts

const mockNeo4jDriver = {
  close: jest.fn(),
  session: jest.fn(),
};
jest.mock('neo4j-driver', () => {
  const driverFn = jest.fn(() => mockNeo4jDriver);
  return {
    __esModule: true,
    driver: driverFn,
    auth: { basic: jest.fn() },
    default: { driver: driverFn, auth: { basic: jest.fn() } },
  };
});

jest.mock('../../src/search/elasticsearch');

describe('Indexer', () => {
  let indexer: Indexer;
  let mockElastic: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup Elastic mock
    mockElastic = {
      createIndex: jest.fn(),
      bulkIndex: jest.fn(),
    };
    (ElasticsearchService as any).mockImplementation(() => mockElastic);

    indexer = new Indexer();
  });

  it('should index cases', async () => {
    const pool = new Pool();
    const mockClient = { query: jest.fn(), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);

    const client = await pool.connect();
    (client.query as jest.Mock).mockResolvedValue({
      rows: [
        { id: '1', title: 'Case 1', status: 'open', createdAt: new Date() },
      ],
    });

    await indexer.indexCases();

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, title'),
    );
    expect(mockElastic.bulkIndex).toHaveBeenCalled();
    const args = mockElastic.bulkIndex.mock.calls[0][0];
    expect(args).toHaveLength(2);
    expect(args[1].title).toBe('Case 1');
    expect(args[1].suggest.input).toBe('Case 1');
  });

  it('should index entities', async () => {
    const pool = new Pool();
    const mockClient = { query: jest.fn(), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);

    const client = await pool.connect();
    (client.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: '2',
          type: 'IOC',
          name: '1.1.1.1',
          properties: { status: 'active' },
          createdAt: new Date(),
        },
      ],
    });

    await indexer.indexEntities();

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, type'),
    );
    expect(mockElastic.bulkIndex).toHaveBeenCalled();
    const args = mockElastic.bulkIndex.mock.calls[0][0];
    expect(args[1].title).toBe('1.1.1.1');
    expect(args[1].type).toBe('IOC');
    expect(args[0].index._index).toBe('iocs');
  });

  it('should initialize indices', async () => {
    await indexer.initializeIndices();
    expect(mockElastic.createIndex).toHaveBeenCalledTimes(5);
  });
});
