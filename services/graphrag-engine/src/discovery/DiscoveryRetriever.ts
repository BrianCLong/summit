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
      const cypher = `
        MATCH (n:Entity)
        WHERE n.id IN $seedIds
        MATCH path = (n)-[*1..${options.maxHops}]-(m:Entity)
        RETURN m.id as entityId, nodes(path) as pathNodes
        LIMIT $maxCandidates
      `;

      const result = await session.run(cypher, {
        seedIds: seedEntityIds,
        maxCandidates: options.maxCandidates
      });

      const candidates: CandidateExplanation[] = result.records.map(record => ({
        id: uuidv4(),
        seedEntities: seedEntityIds,
        discoverySubgraphRef: `subgraph-${uuidv4()}`,
        rationale: `Discovered via ${record.get('pathNodes').length - 1} hops to ${record.get('entityId')}`
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
