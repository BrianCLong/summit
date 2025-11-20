import { ElasticsearchService } from './elasticsearch';
import { AnalyticsService } from './analytics';
import { SearchQuery, SearchResponse } from './types';

export const searchEngine = new ElasticsearchService();
export const analytics = new AnalyticsService(searchEngine);

// Initialize analytics index (fire and forget)
analytics.initialize().catch((err) => {
  console.error('Failed to initialize analytics service', err);
});

export async function search(
  query: SearchQuery,
  userId?: string,
): Promise<SearchResponse> {
  const start = Date.now();
  const response = await searchEngine.search(query);
  const duration = Date.now() - start;

  analytics.logSearch({
    query: query.query,
    resultCount: response.total.value,
    executionTimeMs: duration,
    filters: query.filters,
    userId: userId,
  });

  return response;
}

export async function indexDocument(index: string, id: string, doc: any) {
  return searchEngine.indexDocument(index, id, doc);
}
