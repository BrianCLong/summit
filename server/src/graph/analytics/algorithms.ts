import { GraphStore } from '../store.js';
import neo4j from 'neo4j-driver';

export class GraphAnalytics {
  private store: GraphStore;
  private static readonly DEFAULT_DEGREE_LIMIT = 10;
  private static readonly MAX_DEGREE_LIMIT = 100;
  private static readonly DEFAULT_PATH_DEPTH = 6;
  private static readonly MAX_PATH_DEPTH = 12;

  constructor() {
    this.store = new GraphStore();
  }

  private validatePositiveInt(value: number, name: string, max: number): number {
    if (!Number.isInteger(value)) {
      throw new Error(`${name} must be an integer`);
    }

    if (value <= 0) {
      throw new Error(`${name} must be greater than 0`);
    }

    if (value > max) {
      throw new Error(`${name} must not exceed ${max}`);
    }

    return value;
  }

  async getDegreeCentrality(
    tenantId: string,
    limit: number = GraphAnalytics.DEFAULT_DEGREE_LIMIT,
  ): Promise<any[]> {
    const safeLimit = this.validatePositiveInt(limit, 'limit', GraphAnalytics.MAX_DEGREE_LIMIT);
    const cypher = `
      MATCH (n:GraphNode { tenantId: $tenantId })
      OPTIONAL MATCH (n)-[r]-(m) // Undirected degree
      WITH n, count(r) as degree
      ORDER BY degree DESC
      LIMIT $limit
      RETURN n.globalId, n.entityType, n.attributes.name, degree
    `;
    return await this.store.runCypher(
      cypher,
      { tenantId, limit: neo4j.int(safeLimit) },
      { tenantId },
    );
  }

  async getShortestPath(
    tenantId: string,
    startId: string,
    endId: string,
    maxDepth: number = GraphAnalytics.DEFAULT_PATH_DEPTH,
  ): Promise<any> {
    const depth = this.validatePositiveInt(maxDepth, 'maxDepth', GraphAnalytics.MAX_PATH_DEPTH);
    const cypher = `
      MATCH (start:GraphNode { globalId: $startId, tenantId: $tenantId }),
            (end:GraphNode { globalId: $endId, tenantId: $tenantId }),
            p = shortestPath((start)-[*..${depth}]-(end))
      RETURN p LIMIT 1
    `;
    return await this.store.runCypher(cypher, { tenantId, startId, endId }, { tenantId });
  }
}
