/**
 * Graph Database Client
 * Unified interface for Neo4j graph queries
 */

import neo4j, {
  Driver,
  Session,
  Result,
  Record as Neo4jRecord,
  Node,
  Relationship,
  Path,
  Integer,
} from 'neo4j-driver';
import { z } from 'zod';
import type { Neo4jConfig } from './config.js';
import {
  DEFAULT_QUERY_LIMIT,
  MAX_QUERY_RESULTS,
  DEFAULT_TIMEOUT_MS,
  type QueryLanguage,
} from './constants.js';

export interface GraphQueryResult {
  columns: string[];
  rows: unknown[][];
  summary: {
    resultAvailableAfter: number;
    resultConsumedAfter: number;
    counters: {
      nodesCreated: number;
      nodesDeleted: number;
      relationshipsCreated: number;
      relationshipsDeleted: number;
      propertiesSet: number;
      labelsAdded: number;
      labelsRemoved: number;
    };
    queryType: string;
  };
  totalRows: number;
}

export interface NodeResult {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface RelationshipResult {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, unknown>;
}

export interface PathResult {
  nodes: NodeResult[];
  relationships: RelationshipResult[];
  length: number;
}

export interface QueryOptions {
  language?: QueryLanguage;
  limit?: number;
  timeout?: number;
  parameters?: Record<string, unknown>;
  database?: string;
  readOnly?: boolean;
}

const QueryOptionsSchema = z.object({
  language: z.enum(['cypher', 'gremlin', 'sparql']).default('cypher'),
  limit: z.number().min(1).max(MAX_QUERY_RESULTS).default(DEFAULT_QUERY_LIMIT),
  timeout: z.number().min(1000).default(DEFAULT_TIMEOUT_MS),
  parameters: z.record(z.unknown()).default({}),
  database: z.string().optional(),
  readOnly: z.boolean().default(true),
});

export class GraphClient {
  private driver: Driver | null = null;
  private config: Neo4jConfig;

  constructor(config: Neo4jConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.driver) return;

    const auth = this.config.password
      ? neo4j.auth.basic(this.config.user, this.config.password)
      : undefined;

    this.driver = neo4j.driver(this.config.uri, auth, {
      encrypted: this.config.encrypted ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 60 * 1000, // 60 seconds
    });

    // Verify connectivity
    await this.driver.verifyConnectivity();
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  async query(
    queryString: string,
    options: QueryOptions = {}
  ): Promise<GraphQueryResult> {
    const opts = QueryOptionsSchema.parse(options);

    if (!this.driver) {
      await this.connect();
    }

    const session = this.driver!.session({
      database: opts.database || this.config.database,
      defaultAccessMode: opts.readOnly ? neo4j.session.READ : neo4j.session.WRITE,
    });

    try {
      const result = await session.run(queryString, opts.parameters, {
        timeout: opts.timeout,
      });

      return this.transformResult(result);
    } finally {
      await session.close();
    }
  }

  async queryNodes(
    label?: string,
    properties?: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<NodeResult[]> {
    const labelClause = label ? `:${label}` : '';
    const whereClause = properties
      ? Object.keys(properties)
          .map((k, i) => `n.${k} = $prop${i}`)
          .join(' AND ')
      : '';

    const params: Record<string, unknown> = {};
    if (properties) {
      Object.values(properties).forEach((v, i) => {
        params[`prop${i}`] = v;
      });
    }

    const query = `
      MATCH (n${labelClause})
      ${whereClause ? `WHERE ${whereClause}` : ''}
      RETURN n
      LIMIT $limit
    `;

    const result = await this.query(query, {
      ...options,
      parameters: { ...params, limit: neo4j.int(options.limit || DEFAULT_QUERY_LIMIT) },
    });

    return result.rows.map((row) => this.nodeToResult(row[0] as Node));
  }

  async queryRelationships(
    type?: string,
    options: QueryOptions = {}
  ): Promise<RelationshipResult[]> {
    const typeClause = type ? `:${type}` : '';

    const query = `
      MATCH ()-[r${typeClause}]->()
      RETURN r
      LIMIT $limit
    `;

    const result = await this.query(query, {
      ...options,
      parameters: { limit: neo4j.int(options.limit || DEFAULT_QUERY_LIMIT) },
    });

    return result.rows.map((row) =>
      this.relationshipToResult(row[0] as Relationship)
    );
  }

  async findPaths(
    startId: string,
    endId: string,
    options: QueryOptions & { maxDepth?: number } = {}
  ): Promise<PathResult[]> {
    const maxDepth = options.maxDepth || 5;

    const query = `
      MATCH path = shortestPath((start)-[*1..${maxDepth}]-(end))
      WHERE elementId(start) = $startId AND elementId(end) = $endId
      RETURN path
      LIMIT $limit
    `;

    const result = await this.query(query, {
      ...options,
      parameters: {
        startId,
        endId,
        limit: neo4j.int(options.limit || 10),
      },
    });

    return result.rows.map((row) => this.pathToResult(row[0] as Path));
  }

  async getNeighbors(
    nodeId: string,
    direction: 'in' | 'out' | 'both' = 'both',
    options: QueryOptions = {}
  ): Promise<NodeResult[]> {
    const directionPattern =
      direction === 'in' ? '<-[]-' : direction === 'out' ? '-[]->' : '-[]-';

    const query = `
      MATCH (n)${directionPattern}(neighbor)
      WHERE elementId(n) = $nodeId
      RETURN DISTINCT neighbor
      LIMIT $limit
    `;

    const result = await this.query(query, {
      ...options,
      parameters: {
        nodeId,
        limit: neo4j.int(options.limit || DEFAULT_QUERY_LIMIT),
      },
    });

    return result.rows.map((row) => this.nodeToResult(row[0] as Node));
  }

  async getStats(): Promise<{
    nodeCount: number;
    relationshipCount: number;
    labels: string[];
    relationshipTypes: string[];
  }> {
    const [nodeCountResult, relCountResult, labelsResult, typesResult] =
      await Promise.all([
        this.query('MATCH (n) RETURN count(n) as count'),
        this.query('MATCH ()-[r]->() RETURN count(r) as count'),
        this.query('CALL db.labels() YIELD label RETURN collect(label) as labels'),
        this.query(
          'CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as types'
        ),
      ]);

    return {
      nodeCount: this.toNumber(nodeCountResult.rows[0]?.[0]),
      relationshipCount: this.toNumber(relCountResult.rows[0]?.[0]),
      labels: (labelsResult.rows[0]?.[0] as string[]) || [],
      relationshipTypes: (typesResult.rows[0]?.[0] as string[]) || [],
    };
  }

  async explain(query: string): Promise<{
    plan: string;
    estimatedRows: number;
    dbHits: number;
  }> {
    const result = await this.query(`EXPLAIN ${query}`);
    const plan = result.summary;

    return {
      plan: JSON.stringify(plan, null, 2),
      estimatedRows: 0,
      dbHits: 0,
    };
  }

  async healthCheck(): Promise<{
    connected: boolean;
    latencyMs: number;
    serverInfo?: { version: string; edition: string };
  }> {
    const start = Date.now();

    try {
      if (!this.driver) {
        await this.connect();
      }

      const result = await this.query('RETURN 1 as ping');
      const latencyMs = Date.now() - start;

      const serverInfo = await this.driver!.getServerInfo();

      return {
        connected: true,
        latencyMs,
        serverInfo: {
          version: serverInfo.protocolVersion?.toString() || 'unknown',
          edition: 'community',
        },
      };
    } catch {
      return {
        connected: false,
        latencyMs: Date.now() - start,
      };
    }
  }

  private transformResult(result: Result): GraphQueryResult {
    const records = result.records;
    const summary = result.summary;

    const columns = records.length > 0 ? records[0].keys : [];
    const rows = records.map((record: Neo4jRecord) =>
      record.keys.map((key) => this.transformValue(record.get(key)))
    );

    const counters = summary.counters.updates();

    return {
      columns,
      rows,
      summary: {
        resultAvailableAfter: this.toNumber(summary.resultAvailableAfter),
        resultConsumedAfter: this.toNumber(summary.resultConsumedAfter),
        counters: {
          nodesCreated: counters.nodesCreated,
          nodesDeleted: counters.nodesDeleted,
          relationshipsCreated: counters.relationshipsCreated,
          relationshipsDeleted: counters.relationshipsDeleted,
          propertiesSet: counters.propertiesSet,
          labelsAdded: counters.labelsAdded,
          labelsRemoved: counters.labelsRemoved,
        },
        queryType: summary.queryType,
      },
      totalRows: rows.length,
    };
  }

  private transformValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (neo4j.isInt(value)) {
      return (value as Integer).toNumber();
    }

    if (neo4j.isNode(value)) {
      return this.nodeToResult(value as Node);
    }

    if (neo4j.isRelationship(value)) {
      return this.relationshipToResult(value as Relationship);
    }

    if (neo4j.isPath(value)) {
      return this.pathToResult(value as Path);
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.transformValue(v));
    }

    if (typeof value === 'object') {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        obj[k] = this.transformValue(v);
      }
      return obj;
    }

    return value;
  }

  private nodeToResult(node: Node): NodeResult {
    return {
      id: node.elementId,
      labels: node.labels,
      properties: this.transformProperties(node.properties),
    };
  }

  private relationshipToResult(rel: Relationship): RelationshipResult {
    return {
      id: rel.elementId,
      type: rel.type,
      startNodeId: rel.startNodeElementId,
      endNodeId: rel.endNodeElementId,
      properties: this.transformProperties(rel.properties),
    };
  }

  private pathToResult(path: Path): PathResult {
    return {
      nodes: path.segments.map((s) => this.nodeToResult(s.start)).concat(
        path.segments.length > 0
          ? [this.nodeToResult(path.segments[path.segments.length - 1].end)]
          : []
      ),
      relationships: path.segments.map((s) =>
        this.relationshipToResult(s.relationship)
      ),
      length: path.length,
    };
  }

  private transformProperties(
    props: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      result[key] = this.transformValue(value);
    }
    return result;
  }

  private toNumber(value: unknown): number {
    if (neo4j.isInt(value)) {
      return (value as Integer).toNumber();
    }
    return typeof value === 'number' ? value : 0;
  }
}

export function createGraphClient(config: Neo4jConfig): GraphClient {
  return new GraphClient(config);
}
