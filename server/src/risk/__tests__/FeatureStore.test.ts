import { FeatureStore } from '../FeatureStore';
import { getNeo4jDriver, getPostgresPool } from '../../config/database';

// Mocks
jest.mock('../../config/database');
jest.mock('../../utils/logger');

describe('FeatureStore', () => {
  let featureStore: FeatureStore;
  let mockSession: any;
  let mockRun: jest.Mock;
  let mockClose: jest.Mock;
  let mockPoolQuery: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    mockRun = jest.fn();
    mockClose = jest.fn();
    mockSession = {
      run: mockRun,
      close: mockClose,
    };

    (getNeo4jDriver as jest.Mock).mockReturnValue({
      session: () => mockSession,
    });

    mockPoolQuery = jest.fn();
    (getPostgresPool as jest.Mock).mockReturnValue({
      query: mockPoolQuery,
    });

    featureStore = new FeatureStore();
  });

  it('should aggregate features correctly', async () => {
    // Mock Neo4j response
    mockRun.mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            const data: any = {
              degree: { toNumber: () => 5 },
              caseLinks: { toNumber: () => 2 },
              vtHits: { toNumber: () => 10 },
              createdAt: new Date().toISOString(), // Recent
            };
            return data[key];
          },
        },
      ],
    });

    // Mock Postgres response
    mockPoolQuery.mockResolvedValue({
      rows: [{ count: '50' }],
    });

    const features = await featureStore.getFeatures('test-entity-id', '24h');

    expect(features).toEqual({
      alerts_24h: 0,
      vt_hits_7d: 10,
      case_links_30d: 2,
      temporal_anomaly_24h: 0.5, // 50 / 100
      centrality_30d: 5,
      first_seen_recent: 1,
    });

    expect(mockRun).toHaveBeenCalled();
    expect(mockPoolQuery).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle missing Neo4j record gracefully', async () => {
    mockRun.mockResolvedValue({ records: [] });
    mockPoolQuery.mockResolvedValue({ rows: [{ count: '0' }] });

    const features = await featureStore.getFeatures('unknown-id', '24h');

    expect(features.centrality_30d).toBe(0);
    expect(features.case_links_30d).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    mockRun.mockRejectedValue(new Error('Neo4j Down'));

    const features = await featureStore.getFeatures('id', '24h');

    // Should return defaults (all 0)
    expect(features.centrality_30d).toBe(0);
    expect(features.temporal_anomaly_24h).toBe(0);
  });
});
