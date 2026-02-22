export interface CandidateExplanation {
  id: string;
  seedEntities: string[];
  discoverySubgraphRef: string; // ID or path to the discovery subgraph
  score?: number;
  rationale: string;
}

export interface DiscoveryResult {
  candidates: CandidateExplanation[];
  metadata: {
    hopsReached: number;
    expansionCount: number;
    executionTimeMs: number;
  };
}
