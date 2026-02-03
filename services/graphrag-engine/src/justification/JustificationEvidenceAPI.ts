import { Driver } from 'neo4j-driver';
import { QueryRegistry } from '@summit/graphrag-core';
import { ProofExtractor, ProofSubgraph } from './ProofExtractor.js';

export class JustificationEvidenceAPI {
  constructor(
    private driver: Driver,
    private registry: QueryRegistry
  ) {}

  async fetchProof(
    queryId: string,
    params: Record<string, any>
  ): Promise<ProofSubgraph> {
    const queryMeta = this.registry.queries.find(q => q.id === queryId);
    if (!queryMeta) {
      throw new Error(`Query ${queryId} not found in registry`);
    }

    if (queryMeta.phase !== 'JUSTIFICATION') {
      throw new Error(`Query ${queryId} is not a JUSTIFICATION query`);
    }

    const session = this.driver.session();
    try {
      const result = await session.run(queryMeta.cypher, params);
      return ProofExtractor.extract(result.records);
    } finally {
      await session.close();
    }
  }
}
