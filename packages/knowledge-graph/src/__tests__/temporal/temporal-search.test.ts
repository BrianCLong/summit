import { Driver } from 'neo4j-driver';
import { TemporalSearch } from '../../temporal/temporal-search';

// Mock driver
const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockDriver = {
  session: jest.fn(() => mockSession),
} as unknown as Driver;

describe('TemporalSearch', () => {
  let search: TemporalSearch;

  beforeEach(() => {
    search = new TemporalSearch(mockDriver);
    jest.clearAllMocks();
  });

  describe('fullTextSearch', () => {
    it('should query the full-text index and return mapped results', async () => {
      mockSession.run
        .mockResolvedValueOnce({}) // Create index
        .mockResolvedValueOnce({   // Search query
          records: [
            {
              get: (key: string) => {
                if (key === 'id') return 'node1';
                if (key === 'properties') return { name: 'test' };
                if (key === 'score') return 1.5;
              }
            }
          ]
        });

      const results = await search.fullTextSearch('test query', 5);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('node1');
      expect(results[0].score).toBe(1.5);
      expect(mockSession.run).toHaveBeenCalledTimes(2);
    });
  });

  describe('getGraphDiff', () => {
    it('should return grouped differences by entityId', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === 'entityId') return 'node1';
              if (key === 'version') return { toNumber: () => 1 };
              if (key === 'properties') return { status: 'old' };
            }
          },
          {
            get: (key: string) => {
              if (key === 'entityId') return 'node1';
              if (key === 'version') return { toNumber: () => 2 };
              if (key === 'properties') return { status: 'new' };
            }
          }
        ]
      });

      const diffs = await search.getGraphDiff('2023-01-01T00:00:00Z', '2023-12-31T23:59:59Z');

      expect(diffs['node1']).toHaveLength(2);
      expect(diffs['node1'][0].version).toBe(1);
      expect(diffs['node1'][1].version).toBe(2);
    });
  });
});
