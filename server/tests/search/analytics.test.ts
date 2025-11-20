import { AnalyticsService } from '../../src/search/analytics';
import { ElasticsearchService } from '../../src/search/elasticsearch';

// Mock ElasticsearchService
jest.mock('../../src/search/elasticsearch');

describe('AnalyticsService', () => {
  let analytics: AnalyticsService;
  let mockElastic: any;

  beforeEach(() => {
    mockElastic = {
      createIndex: jest.fn().mockResolvedValue(undefined),
      indexDocument: jest.fn().mockResolvedValue(undefined),
    };
    // Force the mock implementation to be returned by the constructor
    (ElasticsearchService as any).mockImplementation(() => mockElastic);
    analytics = new AnalyticsService(mockElastic);
  });

  it('should initialize index', async () => {
    await analytics.initialize();
    expect(mockElastic.createIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'search_analytics',
      }),
    );
  });

  it('should log search event', async () => {
    await analytics.logSearch({
      query: 'test',
      resultCount: 10,
      executionTimeMs: 50,
    });
    expect(mockElastic.indexDocument).toHaveBeenCalledWith(
      'search_analytics',
      expect.any(String),
      expect.objectContaining({
        query: 'test',
        resultCount: 10,
      }),
    );
  });
});
