import { EvidenceBudget, IntentSpec } from '../intent_compiler.js';

export interface HybridQueryFilters {
  entityIds?: string[];
  sourceSystems?: string[];
  allowlist?: string[];
}

export interface HybridQueryBudget {
  maxNodes: number;
  maxEdges: number;
  maxPaths: number;
}

export interface HybridQuery {
  queryId: string;
  queryText: string;
  k: number;
  filters?: HybridQueryFilters;
  graphHops?: number;
  budget: HybridQueryBudget;
  intent?: IntentSpec;
  weights?: {
    vector: number;
    graph: number;
  };
}

export interface VectorCandidate {
  id: string;
  text: string;
  score: number;
  evidenceIds: string[];
  metadata?: Record<string, unknown>;
}

export interface GraphCandidate {
  id: string;
  text: string;
  score: number;
  evidenceIds: string[];
  metadata?: Record<string, unknown>;
}

export interface HybridCandidate {
  id: string;
  text: string;
  vectorScore: number;
  graphScore: number;
  combinedScore: number;
  evidenceIds: string[];
  metadata?: Record<string, unknown>;
}

export interface HybridRetrievalManifest {
  strategy: 'HYBRID';
  queryId: string;
  sources: string[];
  weights: { vector: number; graph: number };
  budget: HybridQueryBudget;
  graphHops?: number;
}

export interface HybridRetrievalResult {
  manifest: HybridRetrievalManifest;
  candidates: HybridCandidate[];
}

export interface VectorRetriever {
  retrieve(query: HybridQuery): Promise<VectorCandidate[]>;
}

export interface GraphRetriever {
  retrieve(intent: IntentSpec, query: HybridQuery): Promise<GraphCandidate[]>;
}

const DEFAULT_WEIGHTS = Object.freeze({ vector: 0.5, graph: 0.5 });

const normalizeWeights = (weights?: { vector: number; graph: number }) => {
  if (!weights) return DEFAULT_WEIGHTS;
  const total = weights.vector + weights.graph;
  if (total === 0) {
    return DEFAULT_WEIGHTS;
  }
  return {
    vector: weights.vector / total,
    graph: weights.graph / total,
  };
};

const stableSort = (items: HybridCandidate[]): HybridCandidate[] => {
  return [...items].sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) {
      return b.combinedScore - a.combinedScore;
    }
    if (b.vectorScore !== a.vectorScore) {
      return b.vectorScore - a.vectorScore;
    }
    if (b.graphScore !== a.graphScore) {
      return b.graphScore - a.graphScore;
    }
    return a.id.localeCompare(b.id);
  });
};

export class HybridRetriever {
  constructor(
    private readonly vectorRetriever: VectorRetriever,
    private readonly graphRetriever: GraphRetriever,
  ) {}

  async retrieve(query: HybridQuery): Promise<HybridRetrievalResult> {
    if (!query.intent) {
      throw new Error(
        'Graph intent is required. Provide query.intent compiled via IntentCompiler.',
      );
    }

    const budget = new EvidenceBudget({
      maxNodes: query.budget.maxNodes,
      maxEdges: query.budget.maxEdges,
      maxPaths: query.budget.maxPaths,
    });
    const budgetCheck = budget.validate(query.intent);
    if (!budgetCheck.valid) {
      throw new Error(`Evidence budget violation: ${budgetCheck.reason}`);
    }

    const weights = normalizeWeights(query.weights);

    const [vectorCandidates, graphCandidates] = await Promise.all([
      this.vectorRetriever.retrieve(query),
      this.graphRetriever.retrieve(query.intent, query),
    ]);

    const candidateMap = new Map<string, HybridCandidate>();

    for (const candidate of vectorCandidates) {
      const existing = candidateMap.get(candidate.id);
      const graphScore = existing?.graphScore ?? 0;
      const combinedScore =
        weights.vector * candidate.score + weights.graph * graphScore;
      candidateMap.set(candidate.id, {
        id: candidate.id,
        text: candidate.text,
        vectorScore: candidate.score,
        graphScore,
        combinedScore,
        evidenceIds: Array.from(
          new Set([...(existing?.evidenceIds ?? []), ...candidate.evidenceIds]),
        ),
        metadata: { ...existing?.metadata, ...candidate.metadata },
      });
    }

    for (const candidate of graphCandidates) {
      const existing = candidateMap.get(candidate.id);
      const vectorScore = existing?.vectorScore ?? 0;
      const combinedScore =
        weights.vector * vectorScore + weights.graph * candidate.score;
      candidateMap.set(candidate.id, {
        id: candidate.id,
        text: candidate.text,
        vectorScore,
        graphScore: candidate.score,
        combinedScore,
        evidenceIds: Array.from(
          new Set([...(existing?.evidenceIds ?? []), ...candidate.evidenceIds]),
        ),
        metadata: { ...existing?.metadata, ...candidate.metadata },
      });
    }

    const candidates = stableSort(Array.from(candidateMap.values())).slice(
      0,
      query.k,
    );

    return {
      manifest: {
        strategy: 'HYBRID',
        queryId: query.queryId,
        sources: ['vector', 'graph'],
        weights,
        budget: query.budget,
        graphHops: query.graphHops,
      },
      candidates,
    };
  }
}
