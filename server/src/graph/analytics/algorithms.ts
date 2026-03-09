import { runCypher } from "../neo4j.js";
import { GraphStore } from '../store.js';
import { CypherBuilder } from '../queryBuilder.js';
import neo4j from 'neo4j-driver';

export class GraphAnalytics {
  private store: GraphStore;

  constructor() {
    this.store = new GraphStore();
  }

  async getDegreeCentrality(tenantId: string, limit: number = 10): Promise<any[]> {
    const builder = new CypherBuilder()
      .match('(n:GraphNode { tenantId: $tenantId })')
      .optionalMatch('(n)-[r]-(m)')
      .with('n, count(r) as degree')
      .orderBy('degree DESC')
      .limit(limit)
      .return('n.globalId, n.entityType, n.attributes.name, degree');

    const { query, params } = builder.build();
    return await this.store.runCypher(
      query,
      { ...params, tenantId },
      { tenantId },
    );
  }

  async getShortestPath(tenantId: string, startId: string, endId: string): Promise<any> {
    const builder = new CypherBuilder()
      .match('(start:GraphNode { globalId: $startId, tenantId: $tenantId }), (end:GraphNode { globalId: $endId, tenantId: $tenantId }), p = shortestPath((start)-[*]-(end))')
      .return('p');

    const { query, params } = builder.build();
    return await this.store.runCypher(query, { ...params, tenantId, startId, endId }, { tenantId });
  }
}

/**
 * Optimized Spatio-Temporal Event Search
 * Uses Neo4j spatial distance and temporal index constraints.
 */
export async function findSpatioTemporalEvents(
  tenantId: string,
  point: { lat: number, lon: number },
  radiusMeters: number,
  startTime: string,
  endTime: string
) {
  const cypher = `
    MATCH (n:GraphNode { tenantId: $tenantId })
    WHERE n.validFrom >= datetime($startTime)
      AND (n.validTo IS NULL OR n.validTo <= datetime($endTime))
      AND n.attributes.location IS NOT NULL
      AND point.distance(n.attributes.location, point({ latitude: $lat, longitude: $lon })) <= $radiusMeters
    RETURN n.globalId AS id, n.attributes AS attributes, n.validFrom AS time,
           point.distance(n.attributes.location, point({ latitude: $lat, longitude: $lon })) AS distance
    ORDER BY distance ASC
    LIMIT 100
  `;
  return runCypher(cypher, {
    tenantId,
    lat: point.lat,
    lon: point.lon,
    radiusMeters,
    startTime,
    endTime
  });
}
