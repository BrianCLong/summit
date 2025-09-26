import { Client } from '@elastic/elasticsearch';
import type { Pool } from 'pg';
import logger from '../config/logger.js';
import { env } from '../config/env.js';
import { getPostgresPool } from '../db/postgres.js';

export type SearchSource = 'GRAPH' | 'INGESTED';

export interface FullTextSearchParams {
  tenantId: string;
  query: string;
  nodeTypes?: string[];
  sources?: SearchSource[];
  startTimestamp?: string | Date;
  endTimestamp?: string | Date;
  limit?: number;
  offset?: number;
}

export interface FullTextSearchResult {
  id: string;
  type: string;
  nodeType?: string;
  title?: string;
  summary?: string;
  score?: number;
  source: SearchSource;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface FullTextSearchResponse {
  results: FullTextSearchResult[];
  total: number;
  tookMs: number;
}

interface IngestedTableConfig {
  name: string;
  titleColumn: string;
  contentColumn: string;
  timestampColumn: string;
  type: string;
}

const INGESTED_TABLE_CANDIDATES: IngestedTableConfig[] = [
  {
    name: 'ingested_documents',
    titleColumn: 'title',
    contentColumn: 'content',
    timestampColumn: 'ingested_at',
    type: 'DOCUMENT',
  },
  {
    name: 'documents',
    titleColumn: 'title',
    contentColumn: 'content',
    timestampColumn: 'created_at',
    type: 'DOCUMENT',
  },
  {
    name: 'intel_documents',
    titleColumn: 'title',
    contentColumn: 'body',
    timestampColumn: 'created_at',
    type: 'DOCUMENT',
  },
];

export class SearchService {
  private readonly logger = logger.child({ name: 'SearchService' });
  private readonly pool: Pool;
  private readonly indices: string[];
  private readonly tableColumnCache = new Map<string, boolean>();
  private client?: Client;

  constructor(options: { client?: Client; pool?: Pool } = {}) {
    this.pool = options.pool ?? getPostgresPool();
    this.indices = (env.ELASTICSEARCH_INDEX ?? 'intelgraph-search')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (env.ELASTICSEARCH_NODE) {
      this.client =
        options.client ??
        new Client({
          node: env.ELASTICSEARCH_NODE,
          auth:
            env.ELASTICSEARCH_USERNAME && env.ELASTICSEARCH_PASSWORD
              ? {
                  username: env.ELASTICSEARCH_USERNAME,
                  password: env.ELASTICSEARCH_PASSWORD,
                }
              : undefined,
        });
      this.logger.info(
        {
          indices: this.indices,
          node: env.ELASTICSEARCH_NODE,
        },
        'Elasticsearch client initialized for search service',
      );
    } else {
      this.logger.warn('ELASTICSEARCH_NODE not configured, falling back to PostgreSQL full-text search.');
    }
  }

  async fullTextSearch(params: FullTextSearchParams): Promise<FullTextSearchResponse> {
    const startedAt = Date.now();
    const sanitizedQuery = params.query?.trim();

    if (!sanitizedQuery) {
      return { results: [], total: 0, tookMs: 0 };
    }

    const limit = Math.min(params.limit ?? 25, 100);
    const offset = Math.max(params.offset ?? 0, 0);

    if (this.client) {
      try {
        const esResponse = await this.client.search({
          index: this.indices,
          from: offset,
          size: limit,
          query: this.buildElasticsearchQuery(params.tenantId, sanitizedQuery, params),
          highlight: {
            fields: {
              content: {},
              summary: {},
            },
          },
        });

        const hits = esResponse.hits?.hits ?? [];
        const results: FullTextSearchResult[] = hits.map((hit: any) => {
          const source = (hit._source?.source ?? 'GRAPH').toString().toUpperCase() as SearchSource;
          const highlight = hit.highlight?.summary?.[0] ?? hit.highlight?.content?.[0];

          return {
            id: hit._id,
            type: hit._source?.type ?? hit._source?.nodeType ?? 'UNKNOWN',
            nodeType: hit._source?.nodeType ?? hit._source?.type,
            title: hit._source?.title ?? hit._source?.name ?? hit._source?.label,
            summary:
              highlight ??
              hit._source?.summary ??
              (hit._source?.content ? this.truncate(hit._source.content) : undefined),
            score: hit._score ?? undefined,
            source: source === 'INGESTED' ? 'INGESTED' : 'GRAPH',
            tenantId: hit._source?.tenantId ?? params.tenantId,
            createdAt: hit._source?.createdAt ?? hit._source?.ingestedAt,
            updatedAt: hit._source?.updatedAt ?? hit._source?.ingestedAt,
            metadata: hit._source,
          };
        });

        const total =
          typeof esResponse.hits?.total === 'number'
            ? esResponse.hits.total
            : esResponse.hits?.total?.value ?? results.length;

        return {
          results,
          total,
          tookMs: esResponse.took ?? Date.now() - startedAt,
        };
      } catch (error) {
        this.logger.warn({ error }, 'Elasticsearch query failed, falling back to PostgreSQL search');
      }
    }

    return await this.searchPostgres(params, sanitizedQuery, limit, offset, startedAt);
  }

  private buildElasticsearchQuery(tenantId: string, query: string, params: FullTextSearchParams) {
    const filters: any[] = [{ term: { tenantId } }];

    if (params.nodeTypes?.length) {
      filters.push({ terms: { nodeType: params.nodeTypes } });
    }

    if (params.sources?.length) {
      filters.push({ terms: { source: params.sources.map((source) => source.toLowerCase()) } });
    }

    if (params.startTimestamp || params.endTimestamp) {
      filters.push({
        range: {
          updatedAt: {
            gte: params.startTimestamp ? new Date(params.startTimestamp).toISOString() : undefined,
            lte: params.endTimestamp ? new Date(params.endTimestamp).toISOString() : undefined,
          },
        },
      });
    }

    return {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: ['title^3', 'summary^2', 'content', 'props.*', 'labels', 'name'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
        ],
        filter: filters,
      },
    };
  }

  private async searchPostgres(
    params: FullTextSearchParams,
    query: string,
    limit: number,
    offset: number,
    startedAt: number,
  ): Promise<FullTextSearchResponse> {
    const likeQuery = `%${query}%`;
    const results: FullTextSearchResult[] = [];

    const entityValues: any[] = [params.tenantId, likeQuery];
    let entityQuery =
      'SELECT id, tenant_id, kind, props, created_at, updated_at FROM entities WHERE tenant_id = $1 AND (kind ILIKE $2 OR props::text ILIKE $2)';

    if (params.nodeTypes?.length) {
      entityValues.push(params.nodeTypes);
      entityQuery += ` AND kind = ANY($${entityValues.length}::text[])`;
    }

    if (params.startTimestamp) {
      entityValues.push(new Date(params.startTimestamp));
      entityQuery += ` AND updated_at >= $${entityValues.length}`;
    }

    if (params.endTimestamp) {
      entityValues.push(new Date(params.endTimestamp));
      entityQuery += ` AND updated_at <= $${entityValues.length}`;
    }

    entityValues.push(limit);
    entityValues.push(offset);
    entityQuery += ` ORDER BY updated_at DESC LIMIT $${entityValues.length - 1} OFFSET $${entityValues.length}`;

    try {
      const { rows } = await this.pool.query(entityQuery, entityValues);
      for (const row of rows) {
        results.push({
          id: row.id,
          type: row.kind ?? 'ENTITY',
          nodeType: row.kind,
          title: row.props?.name ?? row.kind,
          summary: this.truncate(JSON.stringify(row.props ?? {})),
          score: undefined,
          source: 'GRAPH',
          tenantId: row.tenant_id,
          createdAt: row.created_at?.toISOString?.() ?? row.created_at,
          updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
          metadata: row.props ?? {},
        });
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to execute PostgreSQL entity search');
    }

    const shouldIncludeIngested =
      !params.sources || params.sources.length === 0 || params.sources.includes('INGESTED');

    if (shouldIncludeIngested) {
      for (const config of INGESTED_TABLE_CANDIDATES) {
        const requiredColumns = ['id', 'tenant_id', config.titleColumn, config.contentColumn, config.timestampColumn];
        const cacheKey = `${config.name}:${requiredColumns.join(',')}`;
        let tableValid = this.tableColumnCache.get(cacheKey);

        if (tableValid === undefined) {
          tableValid = await this.tableHasColumns(config.name, requiredColumns);
          this.tableColumnCache.set(cacheKey, tableValid);
        }

        if (!tableValid) {
          continue;
        }

        const values: any[] = [params.tenantId, likeQuery];
        let sql = `SELECT id, tenant_id, ${config.titleColumn} AS title, ${config.contentColumn} AS content, ${config.timestampColumn} AS ts FROM ${config.name} WHERE tenant_id = $1 AND (${config.titleColumn} ILIKE $2 OR ${config.contentColumn} ILIKE $2)`;

        if (params.startTimestamp) {
          values.push(new Date(params.startTimestamp));
          sql += ` AND ${config.timestampColumn} >= $${values.length}`;
        }

        if (params.endTimestamp) {
          values.push(new Date(params.endTimestamp));
          sql += ` AND ${config.timestampColumn} <= $${values.length}`;
        }

        values.push(limit);
        values.push(offset);
        sql += ` ORDER BY ${config.timestampColumn} DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

        try {
          const { rows } = await this.pool.query(sql, values);
          for (const row of rows) {
            results.push({
              id: row.id,
              type: config.type,
              nodeType: config.type,
              title: row.title,
              summary: this.truncate(row.content),
              source: 'INGESTED',
              tenantId: row.tenant_id,
              createdAt: row.ts?.toISOString?.() ?? row.ts,
              updatedAt: row.ts?.toISOString?.() ?? row.ts,
              metadata: { title: row.title },
            });
          }
        } catch (error) {
          this.logger.debug({ table: config.name, error }, 'Skipping ingested data search for table');
        }
      }
    }

    return {
      results,
      total: results.length,
      tookMs: Date.now() - startedAt,
    };
  }

  private async tableHasColumns(table: string, columns: string[]): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = ANY (current_schemas(false)) AND table_name = $1`,
        [table],
      );
      const availableColumns = rows.map((row) => row.column_name);
      return columns.every((column) => availableColumns.includes(column));
    } catch (error) {
      this.logger.debug({ table, error }, 'Failed to inspect table metadata');
      return false;
    }
  }

  private truncate(value: string, length = 280): string {
    if (!value) {
      return value;
    }

    if (value.length <= length) {
      return value;
    }

    return `${value.slice(0, length - 1)}…`;
  }
}

const defaultService = new SearchService();
export default defaultService;
