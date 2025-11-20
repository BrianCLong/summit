import { ElasticsearchService } from './elasticsearch';
import { randomUUID } from 'node:crypto';
import pino from 'pino';

export interface SearchAnalyticsEvent {
  id: string;
  query: string;
  timestamp: Date;
  userId?: string;
  resultCount: number;
  executionTimeMs: number;
  filters?: any;
  sessionId?: string;
}

export class AnalyticsService {
  private elastic: ElasticsearchService;
  private indexName = 'search_analytics';
  private logger = pino({ name: 'AnalyticsService' });

  constructor(elastic: ElasticsearchService) {
    this.elastic = elastic;
  }

  async initialize() {
    const index = {
      name: this.indexName,
      mappings: {
        properties: {
          query: { type: 'text' },
          timestamp: { type: 'date' },
          userId: { type: 'keyword' },
          resultCount: { type: 'integer' },
          executionTimeMs: { type: 'integer' },
          filters: { type: 'object' },
          sessionId: { type: 'keyword' },
        },
      },
      settings: {},
      aliases: [],
    };

    // ElasticsearchService.createIndex handles "already exists" check
    await this.elastic.createIndex(index as any);
  }

  async logSearch(event: Omit<SearchAnalyticsEvent, 'id' | 'timestamp'>) {
    const doc: SearchAnalyticsEvent = {
      id: randomUUID(),
      timestamp: new Date(),
      ...event,
    };

    this.elastic
      .indexDocument(this.indexName, doc.id, doc)
      .catch((err) => {
        this.logger.error({ err }, 'Failed to log search analytics');
      });
  }
}
