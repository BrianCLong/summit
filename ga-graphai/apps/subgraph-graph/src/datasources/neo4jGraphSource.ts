import neo4j, { type Driver, session as neo4jSession } from 'neo4j-driver';
import type { Logger } from 'pino';
import type { Direction, NeighborhoodOptions, PathOptions, PropertyFilter } from '../types.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { toGraphNode, toGraphRelationship, type GraphNode, type NeighborhoodResult, type GraphRelationship, type PathConnection, type GraphPath } from '../utils/mappers.js';
import type { GraphSubgraphConfig } from '../config.js';

export interface QueryContextMeta<T> {
  result: T;
  summary: neo4j.QueryResult['summary'];
  meta: {
    retryCount: number;
  };
}

interface RetryOptions {
  maxRetries: number;
  delayMs: number;
}

export class Neo4jGraphSource {
  private readonly driver: Driver;
  private readonly logger: Logger;
  private readonly retry: RetryOptions;

  constructor(driver: Driver, logger: Logger, config: Pick<GraphSubgraphConfig, 'NEO4J_MAX_RETRIES' | 'NEO4J_RETRY_DELAY_MS'>) {
    this.driver = driver;
    this.logger = logger;
    this.retry = {
      maxRetries: config.NEO4J_MAX_RETRIES,
      delayMs: config.NEO4J_RETRY_DELAY_MS
    };
  }

  async getNode(nodeId: string): Promise<QueryContextMeta<GraphNode | null>> {
    return this.execute(async (session) => {
      const query = 'MATCH (n {id: $nodeId}) RETURN n LIMIT 1';
      const result = await session.run(query, { nodeId });
      const nodeRecord = result.records[0]?.get('n');
      const node = nodeRecord ? toGraphNode(nodeRecord) : null;
      return { result: node, summary: result.summary };
    }, 'getNode');
  }

  async getNeighborhood(options: NeighborhoodOptions): Promise<QueryContextMeta<NeighborhoodResult>> {
    return this.execute(async (session) => {
      const limit = Math.max(1, Math.min(100, options.limit));
      const skip = decodeCursor(options.cursor);
      const limitPlusOne = limit + 1;
      const pattern = buildPattern(options.direction);
      const query = `
        MATCH (n {id: $nodeId})
        WITH n
        MATCH ${pattern}
        WITH n, r, neighbor,
             COALESCE(neighbor.id, toString(id(neighbor))) AS neighborId
        WHERE ($labelFilters = [] OR ANY(label IN labels(neighbor) WHERE label IN $labelFilters))
          AND ALL(filter IN $propertyFilters WHERE neighbor[filter.key] = filter.value)
        ORDER BY neighborId
        SKIP $offset
        LIMIT $limitPlusOne
        RETURN n AS node, collect({ neighbor: neighbor, edge: r }) AS connections
      `;
      const params = {
        nodeId: options.nodeId,
        labelFilters: options.labelFilters ?? [],
        propertyFilters: sanitizePropertyFilters(options.propertyFilters ?? []),
        offset: neo4j.int(skip),
        limitPlusOne: neo4j.int(limitPlusOne)
      };
      const result = await session.run(query, params);
      const record = result.records[0];
      if (!record) {
        throw new Error('NODE_NOT_FOUND');
      }
      const node = toGraphNode(record.get('node'));
      const connections = record.get('connections') as Array<{ neighbor: neo4j.Node; edge: neo4j.Relationship }>;
      const hasExtra = connections.length > limit;
      const trimmed = hasExtra ? connections.slice(0, limit) : connections;
      const neighbors: GraphNode[] = trimmed.map((entry) => toGraphNode(entry.neighbor));
      const edges: GraphRelationship[] = trimmed.map((entry) => toGraphRelationship(entry.edge));
      const endCursor = encodeCursor(skip + trimmed.length);
      return {
        result: {
          node,
          neighbors,
          edges,
          pageInfo: {
            endCursor,
            hasNextPage: hasExtra
          }
        },
        summary: result.summary
      };
    }, 'nodeNeighborhood');
  }

  async findPaths(options: PathOptions): Promise<QueryContextMeta<PathConnection>> {
    return this.execute(async (session) => {
      const limit = Math.max(1, Math.min(50, options.limit));
      const skip = decodeCursor(options.cursor);
      const limitPlusOne = limit + 1;
      const maxHops = Math.min(Math.max(options.maxHops, 2), 3);
      const directionPattern = buildPathPattern(options.direction, maxHops);
      const query = `
        MATCH (start {id: $startId})
        CALL {
          WITH start
          MATCH ${directionPattern} AS p
          WITH p
          WHERE ($labelFilters = [] OR ANY(label IN labels(last(nodes(p))) WHERE label IN $labelFilters))
            AND ($relationshipTypes = [] OR ALL(rel IN relationships(p) WHERE type(rel) IN $relationshipTypes))
            AND ALL(filter IN $propertyFilters WHERE last(nodes(p))[filter.key] = filter.value)
          WITH p
          ORDER BY length(p) ASC, toString(id(last(nodes(p)))) ASC
          SKIP $offset
          LIMIT $limitPlusOne
          RETURN collect(p) AS paths
        }
        RETURN paths
      `;
      const params = {
        startId: options.startId,
        labelFilters: options.labelFilters ?? [],
        relationshipTypes: options.relationshipTypes ?? [],
        propertyFilters: sanitizePropertyFilters(options.propertyFilters ?? []),
        offset: neo4j.int(skip),
        limitPlusOne: neo4j.int(limitPlusOne)
      };
      const result = await session.run(query, params);
      const paths = (result.records[0]?.get('paths') as neo4j.Path[]) ?? [];
      const hasExtra = paths.length > limit;
      const trimmed = hasExtra ? paths.slice(0, limit) : paths;
      const mappedPaths: GraphPath[] = trimmed.map((path) => ({
        nodes: path.nodes.map(toGraphNode),
        edges: path.relationships.map(toGraphRelationship)
      }));
      return {
        result: {
          paths: mappedPaths,
          pageInfo: {
            endCursor: encodeCursor(skip + trimmed.length),
            hasNextPage: hasExtra
          }
        },
        summary: result.summary
      };
    }, 'filteredPaths');
  }

  private async execute<T>(
    fn: (session: neo4j.Session) => Promise<{ result: T; summary: neo4j.QueryResult['summary'] }>,
    label: string
  ): Promise<QueryContextMeta<T>> {
    let attempt = 0;
    while (true) {
      const session = this.driver.session({ defaultAccessMode: neo4jSession.READ });
      try {
        const { result, summary } = await fn(session);
        return { result, summary, meta: { retryCount: attempt } };
      } catch (error) {
        const shouldRetry = attempt < this.retry.maxRetries && isRetriable(error);
        if (!shouldRetry) {
          throw error;
        }
        attempt += 1;
        const delay = this.retry.delayMs * attempt;
        this.logger.warn({ err: error, attempt, label }, 'neo4j_query_retry');
        await session.close().catch(() => {});
        await wait(delay);
        continue;
      } finally {
        await session.close().catch((error) => {
          this.logger.warn({ err: error }, 'neo4j_session_close_error');
        });
      }
    }
  }
}

function sanitizePropertyFilters(filters: PropertyFilter[]): PropertyFilter[] {
  return filters.filter((filter) =>
    typeof filter.key === 'string' && filter.key.length > 0 &&
    (['string', 'number', 'boolean'].includes(typeof filter.value))
  );
}

function buildPattern(direction: Direction): string {
  switch (direction) {
    case 'OUT':
      return '(n)-[r]->(neighbor)';
    case 'IN':
      return '(n)<-[r]-(neighbor)';
    default:
      return '(n)-[r]-(neighbor)';
  }
}

function buildPathPattern(direction: Direction, maxHops: number): string {
  switch (direction) {
    case 'OUT':
      return `(start)-[r*1..${maxHops}]->(target)`;
    case 'IN':
      return `(start)<-[r*1..${maxHops}]-(target)`;
    default:
      return `(start)-[r*1..${maxHops}]-(target)`;
  }
}

function isRetriable(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === 'ServiceUnavailable' || code === 'SessionExpired';
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
