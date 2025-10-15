import GraphQLJSON from 'graphql-type-json';
import type { Logger } from 'winston';
import type { Pool } from 'pg';
import neo4j, { type Driver } from 'neo4j-driver';
import { ElasticsearchService } from '../services/ElasticsearchService';
import type { SearchQuery, SearchResponse, SearchResult } from '../types';

export interface AuthContext {
  tenantId?: string;
  userId?: string;
  roles?: string[];
  allowedNodeTypes?: string[];
}

export interface SearchPolicyEvaluationRequest {
  tenantId: string;
  filters: AdvancedSearchInput;
  auth?: AuthContext;
}

export interface SearchPolicyClientLike {
  allowFilters(request: SearchPolicyEvaluationRequest): Promise<{ allow: boolean; reason?: string }>;
}

export interface Neo4jDriverLike extends Pick<Driver, 'session'> {}

export interface PostgresClientLike extends Pick<Pool, 'query'> {}

export interface ElasticsearchClientLike extends Pick<ElasticsearchService, 'search'> {}

export interface SearchContext {
  postgres: PostgresClientLike;
  neo4j: Neo4jDriverLike;
  elastic: ElasticsearchClientLike;
  opa: SearchPolicyClientLike;
  logger: Logger;
  auth: AuthContext;
}

export interface AdvancedSearchInput {
  tenantId: string;
  query?: string | null;
  statuses?: string[] | null;
  stepTypes?: string[] | null;
  dateRange?: {
    field?: string | null;
    from?: string | null;
    to?: string | null;
  } | null;
  nodeTypes?: string[] | null;
  minRelevance?: number | null;
  limit?: number | null;
  offset?: number | null;
}

interface SearchHighlightResult {
  field: string;
  snippets: string[];
}

interface SearchRelatedNode {
  id: string;
  type: string;
  properties: Record<string, unknown> | null;
}

interface SearchRunResult {
  runId: string;
  status: string | null;
  startedAt: string | null;
  runbook: string | null;
  tenant: string | null;
  relevanceScore: number | null;
  highlights: SearchHighlightResult[];
  relatedNodes: SearchRelatedNode[];
  source: unknown;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function normaliseLimit(limit?: number | null): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
}

function normaliseOffset(offset?: number | null): number {
  if (!offset || Number.isNaN(offset)) {
    return 0;
  }
  return Math.max(Math.floor(offset), 0);
}

function buildSearchQuery(input: AdvancedSearchInput, limit: number, offset: number): SearchQuery {
  const page = Math.floor(offset / limit) + 1;
  const filters: SearchQuery['filters'] = {};

  if (input.dateRange) {
    filters.dateRange = {
      field: input.dateRange.field || 'started_at',
      from: input.dateRange.from || undefined,
      to: input.dateRange.to || undefined,
    };
  }

  if (input.nodeTypes && input.nodeTypes.length > 0) {
    filters.entityTypes = input.nodeTypes;
  }

  if ((input.statuses && input.statuses.length > 0) || (input.stepTypes && input.stepTypes.length > 0)) {
    filters.custom = {
      ...(input.statuses && input.statuses.length ? { status: input.statuses } : {}),
      ...(input.stepTypes && input.stepTypes.length ? { stepTypes: input.stepTypes } : {}),
    };
  }

  const query: SearchQuery = {
    query: input.query ?? '',
    searchType: 'hybrid',
    pagination: {
      page,
      size: limit,
    },
    highlight: {
      fields: ['goal', 'runbook', 'summary', 'description'],
      fragmentSize: 140,
      numberOfFragments: 3,
    },
  };

  if (filters.dateRange || filters.entityTypes || filters.sources || filters.tags || filters.confidence || filters.custom) {
    query.filters = filters;
  }

  return query;
}

function mapHighlights(hit: SearchResult | undefined): SearchHighlightResult[] {
  if (!hit || !hit.highlight || typeof hit.highlight !== 'object') {
    return [];
  }

  return Object.entries(hit.highlight).map(([field, value]) => ({
    field,
    snippets: Array.isArray(value)
      ? value.map((snippet) => String(snippet))
      : [String(value)],
  }));
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

async function loadRelatedNodes(
  ctx: SearchContext,
  ids: string[],
  nodeTypes: string[] | null | undefined,
): Promise<Map<string, SearchRelatedNode[]>> {
  const relations = new Map<string, SearchRelatedNode[]>();

  if (!nodeTypes || nodeTypes.length === 0 || ids.length === 0) {
    return relations;
  }

  const session = ctx.neo4j.session({ defaultAccessMode: neo4j.session.READ });

  try {
    const result = await session.run(
      `
        MATCH (r:Run)
        WHERE (r.id IN $ids OR r.runId IN $ids)
        OPTIONAL MATCH (r)-[:ASSOCIATED_WITH|:MENTIONS|:LINKED_TO|:RELATES_TO]->(n)
        WHERE ANY(label IN labels(n) WHERE label IN $nodeTypes)
        RETURN coalesce(r.id, r.runId) AS runId,
               collect({
                 id: coalesce(n.id, elementId(n)),
                 type: head(labels(n)),
                 properties: properties(n)
               }) AS nodes
      `,
      { ids, nodeTypes },
    );

    for (const record of result.records) {
      const runId = record.get('runId');
      const rawNodes = (record.get('nodes') as Array<Record<string, unknown>>) || [];
      const cleaned = rawNodes
        .filter((node) => node && node.id)
        .map((node) => ({
          id: String(node.id),
          type: node.type ? String(node.type) : 'Unknown',
          properties: (node.properties as Record<string, unknown>) || null,
        }));
      relations.set(String(runId), cleaned);
    }
  } catch (error) {
    ctx.logger.warn('Neo4j enrichment failed for advanced search', {
      error: (error as Error).message,
    });
  } finally {
    await session.close();
  }

  return relations;
}

function mergeResults(
  rows: Array<Record<string, any>>,
  hits: SearchResult[] | null,
  relationships: Map<string, SearchRelatedNode[]>,
  tenantId: string,
  minRelevance: number,
): SearchRunResult[] {
  const byId = new Map<string, Record<string, any>>();
  for (const row of rows) {
    byId.set(String(row.id), row);
  }

  const results: SearchRunResult[] = [];
  const seen = new Set<string>();
  const orderedHits = (hits || []).filter((hit) => typeof hit.score !== 'number' || hit.score >= minRelevance);

  for (const hit of orderedHits) {
    const id = String(hit.id);
    const row = byId.get(id);
    results.push({
      runId: id,
      status: row?.status ?? (hit.source as any)?.status ?? null,
      startedAt: row?.started_at ? parseDate(row.started_at) : ((hit.source as any)?.started_at ?? null),
      runbook: row?.goal ?? (hit.source as any)?.goal ?? (hit.source as any)?.title ?? null,
      tenant: row?.tenant_id ?? tenantId ?? null,
      relevanceScore: typeof hit.score === 'number' ? hit.score : null,
      highlights: mapHighlights(hit),
      relatedNodes: relationships.get(id) ?? [],
      source: hit.source ?? null,
    });
    seen.add(id);
  }

  const remainingRows = rows.filter((row) => !seen.has(String(row.id)));
  for (const row of remainingRows) {
    const id = String(row.id);
    results.push({
      runId: id,
      status: row.status ?? null,
      startedAt: row.started_at ? parseDate(row.started_at) : null,
      runbook: row.goal ?? null,
      tenant: row.tenant_id ?? tenantId ?? null,
      relevanceScore: null,
      highlights: [],
      relatedNodes: relationships.get(id) ?? [],
      source: null,
    });
  }

  return results;
}

export async function resolveAdvancedSearch(
  _: unknown,
  args: { input: AdvancedSearchInput },
  ctx: SearchContext,
): Promise<{
  total: number;
  took: number;
  timedOut: boolean;
  results: SearchRunResult[];
  suggestions: string[];
  facets: Record<string, unknown> | null;
}> {
  const { input } = args;
  const limit = normaliseLimit(input.limit);
  const offset = normaliseOffset(input.offset);
  const minRelevance = typeof input.minRelevance === 'number' ? input.minRelevance : 0;

  const policyDecision = await ctx.opa.allowFilters({
    tenantId: input.tenantId,
    filters: input,
    auth: ctx.auth,
  });

  if (!policyDecision.allow) {
    throw new Error(`Access denied: ${policyDecision.reason || 'search filters rejected by policy'}`);
  }

  const searchQuery = buildSearchQuery(input, limit, offset);

  let esResponse: SearchResponse | null = null;
  try {
    esResponse = await ctx.elastic.search(searchQuery);
  } catch (error) {
    ctx.logger.warn('Elasticsearch search failed, falling back to PostgreSQL results', {
      error: (error as Error).message,
    });
  }

  const hits = esResponse?.results ?? null;
  const hitIds = hits ? hits.map((hit) => String(hit.id)) : [];

  const whereClauses: string[] = [];
  const params: any[] = [];

  let paramIndex = 1;

  if (hitIds.length > 0) {
    whereClauses.push(`runs.id = ANY($${paramIndex++})`);
    params.push(hitIds);
  }

  if (input.tenantId) {
    whereClauses.push(`runs.tenant_id = $${paramIndex++}`);
    params.push(input.tenantId);
  }

  if (input.statuses && input.statuses.length > 0) {
    whereClauses.push(`runs.status = ANY($${paramIndex++})`);
    params.push(input.statuses);
  }

  if (input.dateRange?.from) {
    whereClauses.push(`runs.started_at >= $${paramIndex++}`);
    params.push(new Date(input.dateRange.from));
  }

  if (input.dateRange?.to) {
    whereClauses.push(`runs.started_at <= $${paramIndex++}`);
    params.push(new Date(input.dateRange.to));
  }

  if (input.query && hitIds.length === 0) {
    whereClauses.push(`runs.goal ILIKE $${paramIndex++}`);
    params.push(`%${input.query}%`);
  }

  const orderClause = 'ORDER BY COALESCE(runs.finished_at, runs.started_at, runs.created_at) DESC';

  const limitIndex = paramIndex++;
  const offsetIndex = paramIndex++;

  params.push(limit, offset);

  const sql = `
    SELECT id, status, started_at, finished_at, goal, tenant_id
    FROM runs
    ${whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''}
    ${orderClause}
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
  `;

  const { rows } = await ctx.postgres.query(sql, params);

  const relationships = await loadRelatedNodes(ctx, rows.map((row) => String(row.id)), input.nodeTypes || null);

  const results = mergeResults(rows, hits, relationships, input.tenantId, minRelevance);

  const total = esResponse?.total?.value ?? rows.length;
  const took = esResponse?.took ?? 0;
  const timedOut = esResponse?.timedOut ?? false;
  const suggestions = esResponse?.suggestions?.map((suggestion) => suggestion.text) ?? [];
  const facets = esResponse?.facets ?? null;

  ctx.logger.info('Advanced search executed', {
    tenantId: input.tenantId,
    queryLength: input.query?.length || 0,
    resultCount: results.length,
    total,
    timedOut,
  });

  return {
    total,
    took,
    timedOut,
    results,
    suggestions,
    facets,
  };
}

export const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    advancedSearch: resolveAdvancedSearch,
  },
};
