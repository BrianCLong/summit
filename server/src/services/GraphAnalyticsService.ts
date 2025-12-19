import {
  GraphAnalyticsService,
  GraphScope,
  TenantId,
  EntityId,
  PathResult,
  Subgraph,
  CentralityResult,
  CommunityResult,
  AnomalyResult,
  Entity,
  Edge,
} from '../graph/types';
import { getDriver, runCypher } from '../graph/neo4j';
import logger from '../utils/logger';

export class Neo4jGraphAnalyticsService implements GraphAnalyticsService {
  private static instance: Neo4jGraphAnalyticsService;

  public static getInstance(): Neo4jGraphAnalyticsService {
    if (!Neo4jGraphAnalyticsService.instance) {
      Neo4jGraphAnalyticsService.instance = new Neo4jGraphAnalyticsService();
    }
    return Neo4jGraphAnalyticsService.instance;
  }

  private buildScopeConstraints(scope: GraphScope, nodeVar: string = 'n'): string {
    let constraints = '';
    if (scope.investigationId) {
      constraints += ` AND ${nodeVar}.investigationId = $investigationId`;
    }
    if (scope.collectionId) {
      constraints += ` AND ${nodeVar}.collectionId = $collectionId`;
    }
    return constraints;
  }

  async shortestPath(params: {
    tenantId: TenantId;
    from: EntityId;
    to: EntityId;
    maxDepth?: number;
  }): Promise<PathResult | null> {
    const { tenantId, from, to, maxDepth = 6 } = params;

    const cypher = `
      MATCH (start:Entity {id: $from, tenantId: $tenantId}), (end:Entity {id: $to, tenantId: $tenantId})
      MATCH p = shortestPath((start)-[*..${maxDepth}]-(end))
      RETURN p
    `;

    try {
      const session = getDriver().session();
      try {
        const result = await session.run(cypher, { from, to, tenantId });
        if (result.records.length === 0) return null;

        const path = result.records[0].get('p');
        const nodes: Entity[] = [];
        const edges: Edge[] = [];

        path.segments.forEach((seg: any) => {
           const startNode = seg.start.properties;
           const endNode = seg.end.properties;
           const rel = seg.relationship.properties;

           const mapNode = (n: any) : Entity => ({
               ...n,
               attributes: typeof n.attributes === 'string' ? JSON.parse(n.attributes) : n.attributes || {},
               metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {}
           });

           const mapEdge = (r: any, fromId: string, toId: string, type: string) : Edge => ({
               ...r,
               fromEntityId: fromId,
               toEntityId: toId,
               type: type,
               attributes: typeof r.attributes === 'string' ? JSON.parse(r.attributes) : r.attributes || {},
               metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {}
           });

           if (!nodes.find(n => n.id === startNode.id)) nodes.push(mapNode(startNode));
           if (!nodes.find(n => n.id === endNode.id)) nodes.push(mapNode(endNode));
           if (!edges.find(e => e.id === rel.id)) edges.push(mapEdge(rel, startNode.id, endNode.id, seg.relationship.type));
        });

        return { nodes, edges, cost: path.length };
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error finding shortest path', { error, params });
      throw error;
    }
  }

  async kHopNeighborhood(params: {
    tenantId: TenantId;
    seedIds: EntityId[];
    depth: number;
  }): Promise<Subgraph> {
    return this.kHopNeighborhoodSafe(params);
  }

  async kHopNeighborhoodSafe(params: {
    tenantId: TenantId;
    seedIds: EntityId[];
    depth: number;
  }): Promise<Subgraph> {
      const { tenantId, seedIds, depth } = params;
      const safeDepth = Math.min(depth, 3);

      const cypher = `
        MATCH (start:Entity {tenantId: $tenantId})
        WHERE start.id IN $seedIds
        MATCH (start)-[r*0..${safeDepth}]-(end:Entity {tenantId: $tenantId})
        UNWIND r as rel
        WITH collect(distinct start) + collect(distinct end) as nodes, collect(distinct rel) as rels
        UNWIND nodes as n
        WITH collect(distinct n) as uniqueNodes, rels
        RETURN
          [n in uniqueNodes | n { .* }] as nodes,
          [r in rels | r { .*, type: type(r), fromEntityId: startNode(r).id, toEntityId: endNode(r).id }] as edges
      `;

      const result = await runCypher<{ nodes: any[], edges: any[] }>(cypher, { tenantId, seedIds });
      if (result.length === 0) return { nodes: [], edges: [] };

      const row = result[0];

      const mapEntity = (n: any): Entity => ({
          ...n,
           attributes: typeof n.attributes === 'string' ? JSON.parse(n.attributes) : n.attributes || {},
           metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {}
      });

      const mapEdge = (r: any): Edge => ({
          ...r,
           attributes: typeof r.attributes === 'string' ? JSON.parse(r.attributes) : r.attributes || {},
           metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {}
      });

      return {
          nodes: row.nodes.map(mapEntity),
          edges: row.edges.map(mapEdge)
      };
  }

  async centrality(params: {
    tenantId: TenantId;
    scope: GraphScope;
    algorithm: 'degree' | 'betweenness' | 'eigenvector';
  }): Promise<CentralityResult[]> {
    const { tenantId, scope, algorithm } = params;

    if (algorithm === 'degree') {
       const cypher = `
         MATCH (n:Entity {tenantId: $tenantId})
         WHERE 1=1 ${this.buildScopeConstraints(scope)}
         OPTIONAL MATCH (n)-[r]-()
         RETURN n.id as entityId, count(r) as score
         ORDER BY score DESC
         LIMIT 100
       `;
       const result = await runCypher<{entityId: string, score: number}>(cypher, {
           tenantId,
           investigationId: scope.investigationId,
           collectionId: scope.collectionId
       });

       return result.map((r, i) => ({
           entityId: r.entityId,
           score: Number(r.score),
           rank: i + 1
       }));
    }

    // PageRank approximation (simplified iteration)
    if (algorithm === 'eigenvector') {
        const cypher = `
          MATCH (n:Entity {tenantId: $tenantId})
          WHERE 1=1 ${this.buildScopeConstraints(scope)}
          // Simplified 1-hop importance summation as naive PageRank proxy
          OPTIONAL MATCH (n)<-[]-(neighbor)
          WITH n, count(neighbor) as inDegree
          RETURN n.id as entityId, toFloat(inDegree) as score
          ORDER BY score DESC
          LIMIT 100
        `;
        const result = await runCypher<{entityId: string, score: number}>(cypher, {
            tenantId,
            investigationId: scope.investigationId,
            collectionId: scope.collectionId
        });
        return result.map((r, i) => ({
            entityId: r.entityId,
            score: Number(r.score),
            rank: i + 1
        }));
    }

    return [];
  }

  async communities(params: {
    tenantId: TenantId;
    scope: GraphScope;
  }): Promise<CommunityResult[]> {
     const { tenantId, scope } = params;

     // Connected Components (Basic)
     const cypher = `
        MATCH (n:Entity {tenantId: $tenantId})
        WHERE 1=1 ${this.buildScopeConstraints(scope)}
        OPTIONAL MATCH (n)-[*1..2]-(m:Entity {tenantId: $tenantId})
        WITH n, collect(distinct m.id) as neighbors
        RETURN n.id as entityId, neighbors
        LIMIT 500
     `;

     // Note: True community detection requires iterative algorithms or GDS.
     // This is a placeholder that returns the local neighborhood as a "community"
     // or just returns empty if GDS isn't available.

     const result = await runCypher<{entityId: string, neighbors: string[]}>(cypher, {
        tenantId,
        investigationId: scope.investigationId,
        collectionId: scope.collectionId
     });

     // Simple grouping logic in memory (very naive)
     const communities: Record<string, string[]> = {};
     let cId = 0;

     // Just dummy implementation for foundational API structure
     return result.map(r => ({
         communityId: `c_${r.entityId.substring(0,4)}`,
         entityIds: [r.entityId, ...r.neighbors]
     }));
  }

  async temporalMotifs(params: {
      tenantId: TenantId;
      scope: GraphScope;
  }): Promise<any[]> {
      const { tenantId, scope } = params;
      // Find "bursty" relationships: many edges between same pair in short window
      const cypher = `
        MATCH (a:Entity {tenantId: $tenantId})-[r]->(b:Entity {tenantId: $tenantId})
        WHERE 1=1 ${this.buildScopeConstraints(scope, 'a')}
        WITH a, b, count(r) as freq, collect(r.date) as dates
        WHERE freq > 3
        RETURN a.id as source, b.id as target, freq
        ORDER BY freq DESC
        LIMIT 10
      `;
      const result = await runCypher<any>(cypher, {
          tenantId,
          investigationId: scope.investigationId
      });
      return result;
  }

  async detectAnomalies(params: {
    tenantId: TenantId;
    scope: GraphScope;
    kind?: 'degree' | 'motif';
  }): Promise<AnomalyResult[]> {
    const { tenantId, scope, kind = 'degree' } = params;

    if (kind === 'degree') {
        const cypher = `
            MATCH (n:Entity {tenantId: $tenantId})
            WHERE 1=1 ${this.buildScopeConstraints(scope)}
            OPTIONAL MATCH (n)-[r]-()
            WITH n, count(r) as degree
            WITH avg(degree) as avgDeg, stdev(degree) as stdDev, collect({n: n, degree: degree}) as stats
            UNWIND stats as stat
            WITH stat.n as n, stat.degree as degree, avgDeg, stdDev
            WHERE degree > (avgDeg + (3 * stdDev))
            RETURN n.id as entityId, degree as score
            ORDER BY score DESC
            LIMIT 50
        `;

        const result = await runCypher<{entityId: string, score: number}>(cypher, {
             tenantId,
             investigationId: scope.investigationId,
             collectionId: scope.collectionId
        });

        return result.map(r => ({
            entityId: r.entityId,
            score: Number(r.score),
            kind: 'degree',
            reason: `Degree ${r.score} is significantly higher than average.`
        }));
    }

    return [];
  }
}
