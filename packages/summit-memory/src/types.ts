export type ISODateTime = string;
export type MemoryTier = "episode" | "entity" | "pattern" | "doctrine";
export type GraphKind = "RG" | "BG" | "NG";
export type PromotionState =
  | "candidate"
  | "linked"
  | "validated"
  | "promoted"
  | "demoted"
  | "quarantined"
  | "archived";

export interface ProvenanceRef {
  sourceId: string;
  sourceType: string;
  uri?: string;
  collector?: string;
  hash?: string;
  observedAt?: ISODateTime;
  ingestedAt?: ISODateTime;
}

export interface Claim {
  claimId: string;
  entityId: string;
  predicate: string;
  object: string;
  confidence: number;
  eventTime: ISODateTime;
  ingestTime: ISODateTime;
  validityStart?: ISODateTime;
  validityEnd?: ISODateTime | null;
  provenance: ProvenanceRef[];
  policyTags: string[];
}

export interface WriteSet {
  writeSetId: string;
  entityId: string;
  memoryObjectId: string;
  graphIntents: GraphKind[];
  tier: MemoryTier;
  eventTime: ISODateTime;
  ingestTime: ISODateTime;
  claimRefs: string[];
  embeddingRefs: string[];
  provenanceRefs: ProvenanceRef[];
  confidence: number;
  policyTags: string[];
  supersedes: string[];
  conflictsWith: string[];
  promotionState: PromotionState;
  content: {
    title?: string;
    summary?: string;
    body?: string;
  };
}

export interface MemoryObject {
  memoryObjectId: string;
  entityId: string;
  graphKind: GraphKind;
  tier: MemoryTier;
  state: PromotionState;
  eventTime: ISODateTime;
  ingestTime: ISODateTime;
  validityStart?: ISODateTime;
  validityEnd?: ISODateTime | null;
  claimRefs: string[];
  lineage: {
    supersedes: string[];
    supersededBy: string[];
    conflictsWith: string[];
  };
  score?: number;
  why?: string[];
}

export interface ReplayQuery {
  asOfEventTime?: ISODateTime;
  asOfIngestTime?: ISODateTime;
  entityId?: string;
  graphKind?: GraphKind;
  includeQuarantined?: boolean;
}

export interface Conflict {
  leftWriteSetId: string;
  rightWriteSetId: string;
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface PromotionPolicy {
  minConfidence: number;
  minProvenanceCount: number;
  allowTags?: string[];
  denyTags?: string[];
  promotionTarget: PromotionState;
}
