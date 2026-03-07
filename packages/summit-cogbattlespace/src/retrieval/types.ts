export type PromotionLane =
  | "CANDIDATE"
  | "OBSERVED"
  | "TRUSTED"
  | "PROMOTED";

export type LaneQueryPolicy =
  | "PROMOTED_ONLY"
  | "TRUSTED_AND_UP"
  | "OBSERVED_AND_UP"
  | "ALL_LANES";

export type RetrievalMode =
  | "GRAPH_ONLY"
  | "VECTOR_ONLY"
  | "HYBRID";

export type ProvenanceMarker = {
  lane: PromotionLane;
  trustScore?: number;
  confidenceScore?: number;
  collector?: string;
  attested?: boolean;
  sourceTrustTier?: string;
  provenanceStrength?: string;
};

export type RetrievalHit = {
  id: string;
  entityType: string;
  score: number;
  payload: Record<string, unknown>;
  provenance: ProvenanceMarker;
};

export type RetrievalRequest = {
  query: string;
  lanePolicy: LaneQueryPolicy;
  retrievalMode?: RetrievalMode;
  limit?: number;
  includeProvenance?: boolean;
};

export type RetrievalResponse = {
  hits: RetrievalHit[];
  lanePolicy: LaneQueryPolicy;
  diagnostics?: {
    filteredByLane: number;
    returned: number;
    mode: RetrievalMode;
  };
};
