import { GraphStore } from '../store.js';
import neo4j from 'neo4j-driver';

export class GraphAnalytics {
  private store: GraphStore;

  constructor() {
    this.store = new GraphStore();
  }

  async getDegreeCentrality(tenantId: string, limit: number = 10): Promise<any[]> {
    const cypher = `
      MATCH (n:GraphNode { tenantId: $tenantId })
      OPTIONAL MATCH (n)-[r]-(m) // Undirected degree
      WITH n, count(r) as degree
      ORDER BY degree DESC
      LIMIT $limit
      RETURN n.globalId, n.entityType, n.attributes.name, degree
    `;
    return await this.store.runCypher(cypher, { tenantId, limit: neo4j.int(limit) });
  }

  async getShortestPath(tenantId: string, startId: string, endId: string): Promise<any> {
    const cypher = `
      MATCH (start:GraphNode { globalId: $startId, tenantId: $tenantId }),
            (end:GraphNode { globalId: $endId, tenantId: $tenantId }),
            p = shortestPath((start)-[*]-(end))
      RETURN p
    `;
    return await this.store.runCypher(cypher, { tenantId, startId, endId });
  }
}
