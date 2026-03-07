import type { ISODateTime } from "../types";

export type CogDomain = "NG" | "BG";

export type CogEntityType =
  | "Artifact"
  | "Narrative"
  | "Belief"
  | "NarrativeClaimLink"
  | "BeliefClaimLink"
  | "NarrativeBeliefLink"
  | "DivergenceMetric"
  | "BeliefGapMetric";

export type CogAction = "UPSERT" | "APPEND" | "MERGE" | "DELETE";

export type CogWriteOp = {
  opId: string;
  domain: CogDomain;
  entityType: CogEntityType;
  action: CogAction;
  payload: Record<string, unknown>;
  hints?: {
    idempotencyKey?: string;
    ttlSeconds?: number;
    priority?: number;
  };
};

export type CogWriteSet = {
  kind: "cog_writeset";
  version: "v1";
  writesetId: string;
  createdAt: ISODateTime;
  origin: { actor: string; pipeline: string; runId: string };
  batchSignature: string;
  idempotencyPolicy?: "REPLAY_SAFE" | "REQUIRE_FRESH";
  scope?: { allowDomains: CogDomain[]; denyDomains: ("RG")[] };
  ops: CogWriteOp[];
};

export type CogRejectionError = {
  code: string;
  message: string;
  instancePath?: string;
  schemaPath?: string;
  details?: Record<string, unknown>;
};

export type CogOpOutcomeStatus =
  | "APPLIED"
  | "MERGED"
  | "PROMOTED"
  | "ALREADY_APPLIED"
  | "DUPLICATE_OP"
  | "NOOP_ENTITY"
  | "QUARANTINED"
  | "REVIEW"
  | "REJECTED_SCHEMA"
  | "REJECTED_POLICY";

export type CogRejectionItem = {
  opId: string;
  status:
    | "APPLIED"
    | "MERGED"
    | "PROMOTED"
    | "ALREADY_APPLIED"
    | "DUPLICATE_OP"
    | "NOOP_ENTITY"
    | "QUARANTINED"
    | "REVIEW"
    | "REJECTED";
  entityType?: string;
  domain?: string;
  action?: string;
  errors?: CogRejectionError[];
};

export type CogRejectionReport = {
  ok: boolean;
  writesetId: string;
  batchSignature?: string;
  summary: {
    receivedOps: number;
    appliedOps: number;
    mergedOps: number;
    promotedOps: number;
    alreadyAppliedOps: number;
    duplicateOps: number;
    noopEntityOps: number;
    quarantinedOps: number;
    reviewOps: number;
    rejectedOps: number;
  };
  items: CogRejectionItem[];
};

export type BatchReplayOpOutcome = {
  opId: string;
  domain: CogDomain;
  entityType: CogEntityType;
  action: CogAction;
  status: CogOpOutcomeStatus;
  recordedAt: ISODateTime;
  idempotencyKey?: string;
  entityFingerprint?: string;
  errors?: CogRejectionError[];
};

export type BatchReplayRecord = {
  batchSignature: string;
  writesetId: string;
  appliedAt: ISODateTime;
  origin: { actor: string; pipeline: string; runId: string };
  opIds: string[];
  outcomes: BatchReplayOpOutcome[];
};

export type OpDedupRecord = {
  idempotencyKey: string;
  firstSeenAt: ISODateTime;
  firstBatchSignature: string;
  opId: string;
  entityType: CogEntityType;
  domain: CogDomain;
  action: CogAction;
  entityFingerprint?: string;
};

export type EntityDedupRecord = {
  entityFingerprint: string;
  firstSeenAt: ISODateTime;
  firstBatchSignature: string;
  firstOpId: string;
  entityType: CogEntityType;
  domain: CogDomain;
  action: CogAction;
};
