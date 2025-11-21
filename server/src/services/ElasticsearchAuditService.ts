/**
 * Elasticsearch Audit Service
 * Provides log aggregation, full-text search, and analytics for audit data
 */

import { Client } from '@elastic/elasticsearch';
import { Pool } from 'pg';
import logger from '../config/logger.js';

const serviceLogger = logger.child({ name: 'ElasticsearchAuditService' });

// ============================================================================
// TYPES
// ============================================================================

export interface AuditSearchQuery {
  tenantId: string;
  query?: string; // Full-text search query
  filters?: {
    eventType?: string[];
    aggregateType?: string[];
    userId?: string[];
    startDate?: Date;
    endDate?: Date;
    dataClassification?: string[];
    legalBasis?: string[];
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  from?: number;
  size?: number;
}

export interface AuditAggregationQuery {
  tenantId: string;
  aggregation: {
    type: 'terms' | 'date_histogram' | 'cardinality' | 'avg' | 'sum' | 'stats';
    field: string;
    interval?: string; // For date_histogram
    size?: number; // For terms
  };
  filters?: AuditSearchQuery['filters'];
}

export interface AuditSearchResult {
  total: number;
  hits: Array<{
    id: string;
    score: number;
    source: any;
  }>;
  aggregations?: Record<string, any>;
}

// ============================================================================
// ELASTICSEARCH AUDIT SERVICE
// ============================================================================

export class ElasticsearchAuditService {
  private client: Client | null = null;
  private indexPrefix = 'audit';
  private isConnected = false;

  constructor(
    private pg: Pool,
    private esConfig?: {
      node: string;
      auth?: {
        username: string;
        password: string;
      };
      tls?: {
        rejectUnauthorized: boolean;
      };
    },
  ) {
    this.initializeClient();
  }

  /**
   * Initialize Elasticsearch client
   */
  private async initializeClient(): Promise<void> {
    if (!this.esConfig) {
      serviceLogger.warn(
        'Elasticsearch configuration not provided, audit search will be limited',
      );
      return;
    }

    try {
      this.client = new Client(this.esConfig);

      // Verify connection
      const health = await this.client.cluster.health();
      this.isConnected = true;

      serviceLogger.info(
        { status: health.status },
        'Elasticsearch client initialized',
      );

      // Create index templates
      await this.createIndexTemplates();
    } catch (error) {
      serviceLogger.error(
        { error: (error as Error).message },
        'Failed to initialize Elasticsearch client',
      );
      this.isConnected = false;
    }
  }

  /**
   * Create index templates for audit logs
   */
  private async createIndexTemplates(): Promise<void> {
    if (!this.client) return;

    const templates = [
      {
        name: `${this.indexPrefix}-events`,
        pattern: `${this.indexPrefix}-events-*`,
        mappings: {
          properties: {
            event_id: { type: 'keyword' },
            event_type: { type: 'keyword' },
            aggregate_type: { type: 'keyword' },
            aggregate_id: { type: 'keyword' },
            aggregate_version: { type: 'integer' },
            tenant_id: { type: 'keyword' },
            user_id: { type: 'keyword' },
            correlation_id: { type: 'keyword' },
            causation_id: { type: 'keyword' },
            legal_basis: { type: 'keyword' },
            data_classification: { type: 'keyword' },
            retention_policy: { type: 'keyword' },
            event_data: { type: 'object', enabled: true },
            event_metadata: { type: 'object', enabled: true },
            event_timestamp: { type: 'date' },
            created_at: { type: 'date' },
            ip_address: { type: 'ip' },
            user_agent: { type: 'text' },
            session_id: { type: 'keyword' },
            request_id: { type: 'keyword' },
          },
        },
        settings: {
          number_of_shards: 3,
          number_of_replicas: 1,
          refresh_interval: '5s',
        },
      },
      {
        name: `${this.indexPrefix}-access`,
        pattern: `${this.indexPrefix}-access-*`,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            tenant_id: { type: 'keyword' },
            case_id: { type: 'keyword' },
            user_id: { type: 'keyword' },
            action: { type: 'keyword' },
            resource_type: { type: 'keyword' },
            resource_id: { type: 'keyword' },
            reason: { type: 'text' },
            legal_basis: { type: 'keyword' },
            warrant_id: { type: 'keyword' },
            authority_reference: { type: 'text' },
            ip_address: { type: 'ip' },
            user_agent: { type: 'text' },
            session_id: { type: 'keyword' },
            request_id: { type: 'keyword' },
            correlation_id: { type: 'keyword' },
            created_at: { type: 'date' },
            hash: { type: 'keyword' },
            previous_hash: { type: 'keyword' },
          },
        },
        settings: {
          number_of_shards: 3,
          number_of_replicas: 1,
          refresh_interval: '5s',
        },
      },
      {
        name: `${this.indexPrefix}-phi`,
        pattern: `${this.indexPrefix}-phi-*`,
        mappings: {
          properties: {
            access_id: { type: 'keyword' },
            tenant_id: { type: 'keyword' },
            phi_type: { type: 'keyword' },
            phi_id: { type: 'keyword' },
            phi_classification: { type: 'keyword' },
            access_type: { type: 'keyword' },
            access_purpose: { type: 'keyword' },
            user_id: { type: 'keyword' },
            user_role: { type: 'keyword' },
            user_npi: { type: 'keyword' },
            authorization_type: { type: 'keyword' },
            minimum_necessary_justification: { type: 'text' },
            data_elements_accessed: { type: 'keyword' },
            ip_address: { type: 'ip' },
            access_timestamp: { type: 'date' },
            security_incident_flagged: { type: 'boolean' },
            incident_reason: { type: 'text' },
          },
        },
        settings: {
          number_of_shards: 3,
          number_of_replicas: 1,
          refresh_interval: '5s',
        },
      },
    ];

    for (const template of templates) {
      try {
        await this.client.indices.putIndexTemplate({
          name: template.name,
          index_patterns: [template.pattern],
          template: {
            mappings: template.mappings,
            settings: template.settings,
          },
        });

        serviceLogger.info({ template: template.name }, 'Index template created');
      } catch (error) {
        serviceLogger.error(
          { error: (error as Error).message, template: template.name },
          'Failed to create index template',
        );
      }
    }
  }

  /**
   * Index event store data to Elasticsearch
   */
  async indexEvent(event: any): Promise<void> {
    if (!this.client || !this.isConnected) {
      serviceLogger.debug('Elasticsearch not available, skipping indexing');
      return;
    }

    const index = this.getIndexName('events');

    try {
      await this.client.index({
        index,
        id: event.event_id,
        document: {
          event_id: event.event_id,
          event_type: event.event_type,
          aggregate_type: event.aggregate_type,
          aggregate_id: event.aggregate_id,
          aggregate_version: event.aggregate_version,
          tenant_id: event.tenant_id,
          user_id: event.user_id,
          correlation_id: event.correlation_id,
          causation_id: event.causation_id,
          legal_basis: event.legal_basis,
          data_classification: event.data_classification,
          retention_policy: event.retention_policy,
          event_data: event.event_data,
          event_metadata: event.event_metadata,
          event_timestamp: event.event_timestamp,
          created_at: event.created_at,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          session_id: event.session_id,
          request_id: event.request_id,
        },
      });

      serviceLogger.debug({ eventId: event.event_id }, 'Event indexed to Elasticsearch');
    } catch (error) {
      serviceLogger.error(
        { error: (error as Error).message, eventId: event.event_id },
        'Failed to index event',
      );
    }
  }

  /**
   * Index access log to Elasticsearch
   */
  async indexAccessLog(accessLog: any): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    const index = this.getIndexName('access');

    try {
      await this.client.index({
        index,
        id: accessLog.id,
        document: accessLog,
      });

      serviceLogger.debug({ id: accessLog.id }, 'Access log indexed to Elasticsearch');
    } catch (error) {
      serviceLogger.error(
        { error: (error as Error).message, id: accessLog.id },
        'Failed to index access log',
      );
    }
  }

  /**
   * Index PHI access log to Elasticsearch
   */
  async indexPHIAccessLog(phiLog: any): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    const index = this.getIndexName('phi');

    try {
      await this.client.index({
        index,
        id: phiLog.access_id,
        document: phiLog,
      });

      serviceLogger.debug({ accessId: phiLog.access_id }, 'PHI access log indexed');
    } catch (error) {
      serviceLogger.error(
        { error: (error as Error).message, accessId: phiLog.access_id },
        'Failed to index PHI access log',
      );
    }
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(query: AuditSearchQuery): Promise<AuditSearchResult> {
    if (!this.client || !this.isConnected) {
      // Fallback to PostgreSQL search
      return this.searchAuditLogsInPostgres(query);
    }

    const index = `${this.indexPrefix}-*`;

    try {
      // Build Elasticsearch query
      const esQuery: any = {
        bool: {
          must: [
            { term: { tenant_id: query.tenantId } },
          ],
        },
      };

      // Add full-text search
      if (query.query) {
        esQuery.bool.must.push({
          multi_match: {
            query: query.query,
            fields: ['*'],
            type: 'best_fields',
          },
        });
      }

      // Add filters
      if (query.filters) {
        const filters: any[] = [];

        if (query.filters.eventType && query.filters.eventType.length > 0) {
          filters.push({ terms: { event_type: query.filters.eventType } });
        }

        if (query.filters.aggregateType && query.filters.aggregateType.length > 0) {
          filters.push({ terms: { aggregate_type: query.filters.aggregateType } });
        }

        if (query.filters.userId && query.filters.userId.length > 0) {
          filters.push({ terms: { user_id: query.filters.userId } });
        }

        if (query.filters.startDate || query.filters.endDate) {
          const range: any = {};
          if (query.filters.startDate) {
            range.gte = query.filters.startDate.toISOString();
          }
          if (query.filters.endDate) {
            range.lte = query.filters.endDate.toISOString();
          }
          filters.push({ range: { event_timestamp: range } });
        }

        if (query.filters.dataClassification && query.filters.dataClassification.length > 0) {
          filters.push({ terms: { data_classification: query.filters.dataClassification } });
        }

        if (query.filters.legalBasis && query.filters.legalBasis.length > 0) {
          filters.push({ terms: { legal_basis: query.filters.legalBasis } });
        }

        if (filters.length > 0) {
          esQuery.bool.filter = filters;
        }
      }

      // Execute search
      const result = await this.client.search({
        index,
        query: esQuery,
        sort: query.sort
          ? [{ [query.sort.field]: { order: query.sort.order } }]
          : [{ event_timestamp: { order: 'desc' } }],
        from: query.from || 0,
        size: query.size || 100,
      });

      return {
        total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
        hits: result.hits.hits.map((hit: any) => ({
          id: hit._id,
          score: hit._score || 0,
          source: hit._source,
        })),
      };
    } catch (error) {
      serviceLogger.error(
        { error: (error as Error).message },
        'Failed to search audit logs in Elasticsearch, falling back to PostgreSQL',
      );

      // Fallback to PostgreSQL
      return this.searchAuditLogsInPostgres(query);
    }
  }

  /**
   * Aggregate audit data
   */
  async aggregateAuditData(query: AuditAggregationQuery): Promise<any> {
    if (!this.client || !this.isConnected) {
      // Fallback to PostgreSQL aggregation
      return this.aggregateInPostgres(query);
    }

    const index = `${this.indexPrefix}-*`;

    try {
      // Build aggregation
      const agg: any = {};
      switch (query.aggregation.type) {
        case 'terms':
          agg.terms = {
            field: query.aggregation.field,
            size: query.aggregation.size || 10,
          };
          break;
        case 'date_histogram':
          agg.date_histogram = {
            field: query.aggregation.field,
            calendar_interval: query.aggregation.interval || 'day',
          };
          break;
        case 'cardinality':
          agg.cardinality = { field: query.aggregation.field };
          break;
        case 'avg':
        case 'sum':
        case 'stats':
          agg[query.aggregation.type] = { field: query.aggregation.field };
          break;
      }

      // Build query with filters
      const esQuery: any = {
        bool: {
          must: [{ term: { tenant_id: query.tenantId } }],
        },
      };

      if (query.filters) {
        // Add same filters as search
        // ... (similar to searchAuditLogs)
      }

      const result = await this.client.search({
        index,
        query: esQuery,
        size: 0,
        aggs: {
          result: agg,
        },
      });

      return result.aggregations?.result;
    } catch (error) {
      serviceLogger.error(
        { error: (error as Error).message },
        'Failed to aggregate data in Elasticsearch',
      );

      // Fallback to PostgreSQL
      return this.aggregateInPostgres(query);
    }
  }

  /**
   * Fallback: Search in PostgreSQL
   */
  private async searchAuditLogsInPostgres(
    query: AuditSearchQuery,
  ): Promise<AuditSearchResult> {
    const params: any[] = [query.tenantId];
    let sql = `SELECT * FROM event_store WHERE tenant_id = $1`;
    let paramIndex = 2;

    // Add filters
    if (query.filters?.eventType && query.filters.eventType.length > 0) {
      sql += ` AND event_type = ANY($${paramIndex})`;
      params.push(query.filters.eventType);
      paramIndex++;
    }

    if (query.filters?.aggregateType && query.filters.aggregateType.length > 0) {
      sql += ` AND aggregate_type = ANY($${paramIndex})`;
      params.push(query.filters.aggregateType);
      paramIndex++;
    }

    if (query.filters?.userId && query.filters.userId.length > 0) {
      sql += ` AND user_id = ANY($${paramIndex})`;
      params.push(query.filters.userId);
      paramIndex++;
    }

    if (query.filters?.startDate) {
      sql += ` AND event_timestamp >= $${paramIndex}`;
      params.push(query.filters.startDate);
      paramIndex++;
    }

    if (query.filters?.endDate) {
      sql += ` AND event_timestamp <= $${paramIndex}`;
      params.push(query.filters.endDate);
      paramIndex++;
    }

    // Full-text search using PostgreSQL
    if (query.query) {
      sql += ` AND (
        event_type ILIKE $${paramIndex} OR
        aggregate_type ILIKE $${paramIndex} OR
        event_data::text ILIKE $${paramIndex}
      )`;
      params.push(`%${query.query}%`);
      paramIndex++;
    }

    sql += ` ORDER BY event_timestamp DESC`;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(query.size || 100, query.from || 0);

    const { rows } = await this.pg.query(sql, params);

    // Get total count
    const { rows: countRows } = await this.pg.query(
      `SELECT COUNT(*) as count FROM event_store WHERE tenant_id = $1`,
      [query.tenantId],
    );

    return {
      total: parseInt(countRows[0]?.count || '0', 10),
      hits: rows.map((row: any) => ({
        id: row.event_id,
        score: 1.0,
        source: row,
      })),
    };
  }

  /**
   * Fallback: Aggregate in PostgreSQL
   */
  private async aggregateInPostgres(query: AuditAggregationQuery): Promise<any> {
    // Simple aggregation implementation
    const { rows } = await this.pg.query(
      `SELECT ${query.aggregation.field}, COUNT(*) as count
       FROM event_store
       WHERE tenant_id = $1
       GROUP BY ${query.aggregation.field}
       ORDER BY count DESC
       LIMIT ${query.aggregation.size || 10}`,
      [query.tenantId],
    );

    return {
      buckets: rows.map((row: any) => ({
        key: row[query.aggregation.field],
        doc_count: parseInt(row.count, 10),
      })),
    };
  }

  /**
   * Get index name with current date suffix
   */
  private getIndexName(type: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${this.indexPrefix}-${type}-${year}.${month}`;
  }

  /**
   * Bulk sync audit logs from PostgreSQL to Elasticsearch
   */
  async bulkSyncAuditLogs(tenantId: string, batchSize = 1000): Promise<void> {
    if (!this.client || !this.isConnected) {
      serviceLogger.warn('Elasticsearch not available, skipping bulk sync');
      return;
    }

    serviceLogger.info({ tenantId }, 'Starting bulk sync of audit logs');

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { rows } = await this.pg.query(
        `SELECT * FROM event_store
         WHERE tenant_id = $1
         ORDER BY event_timestamp
         LIMIT $2 OFFSET $3`,
        [tenantId, batchSize, offset],
      );

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      // Bulk index
      const operations = rows.flatMap((row: any) => [
        { index: { _index: this.getIndexName('events'), _id: row.event_id } },
        row,
      ]);

      try {
        await this.client.bulk({ operations });
        serviceLogger.info(
          { count: rows.length, offset },
          'Bulk indexed audit events',
        );
      } catch (error) {
        serviceLogger.error(
          { error: (error as Error).message, offset },
          'Failed to bulk index events',
        );
      }

      offset += batchSize;
    }

    serviceLogger.info({ tenantId }, 'Bulk sync completed');
  }
}
