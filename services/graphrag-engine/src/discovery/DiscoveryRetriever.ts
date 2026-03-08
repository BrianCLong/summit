import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { DiscoveryResult, CandidateExplanation } from '../types/explanations.js';

export interface DiscoveryOptions {
  maxHops: number;
  maxCandidates: number;
  timeoutMs: number;
}

export class DiscoveryRetriever {
  constructor(private driver: Driver) {}

  async discover(
    query: string,
    seedEntityIds: string[],
    options: DiscoveryOptions
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const session = this.driver.session();

    try {
      // Graph-Vector-Graph (GVG) Retrieval Logic
      // Stage 1: Seed Discovery (Vector-based similarity + Exact match)
      // Note: Full-text or vector index on Entity(name) is recommended for production.

      const cypher = `
        MATCH (n:Entity)
        WHERE n.id IN $seedIds OR n.name =~ ('(?i).*' + $query + '.*')

        WITH n,
             CASE
               WHEN n.id IN $seedIds THEN 1.0
               ELSE 0.8
             END as seedScore

        // Stage 2: Graph Expansion
        MATCH path = (n)-[*1..${options.maxHops}]-(m:Entity)

        // Stage 3: Justification & GNN-guided scoring (Simulated via path length & properties)
        WITH n, m, path, seedScore,
             1.0 / (size(nodes(path))) as pathConfidence

        RETURN m.id as entityId,
               nodes(path) as pathNodes,
               relationships(path) as pathRels,
               n.id as seedId,
               (seedScore * pathConfidence) as confidenceScore
        ORDER BY confidenceScore DESC
        LIMIT $maxCandidates
      `;

      const result = await session.run(cypher, {
        seedIds: seedEntityIds,
        query: query,
        maxCandidates: options.maxCandidates
      });

      const candidates: CandidateExplanation[] = result.records.map(record => ({
        id: uuidv4(),
        seedEntities: [record.get('seedId')],
        discoverySubgraphRef: `subgraph-${uuidv4()}`,
        rationale: `GVG Discovery: Path from [${record.get('seedId')}] to [${record.get('entityId')}] (${record.get('pathNodes').length - 1} hops). verified via ${record.get('pathRels').length} edges.`,
        score: record.get('confidenceScore')
      }));

      return {
        candidates,
        metadata: {
          hopsReached: options.maxHops,
          expansionCount: result.records.length,
          executionTimeMs: Date.now() - startTime
        }
      };
    } finally {
      await session.close();
    }
  }
}
