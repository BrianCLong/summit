import type { ISODateTime } from '../types';

export type CogDomain = 'NG' | 'BG';

export type CogEntityType =
  | 'Artifact'
  | 'Narrative'
  | 'Belief'
  | 'NarrativeClaimLink'
  | 'BeliefClaimLink'
  | 'NarrativeBeliefLink'
  | 'DivergenceMetric'
  | 'BeliefGapMetric';

export type CogAction = 'UPSERT' | 'APPEND' | 'MERGE' | 'DELETE';

export type CogWriteOp = {
  opId: string;
  domain: CogDomain;
  entityType: CogEntityType;
  action: CogAction;
  payload: Record<string, unknown>;
  hints?: { idempotencyKey?: string; ttlSeconds?: number; priority?: number };
};

export type CogWriteSet = {
  kind: 'cog_writeset';
  version: 'v1';
  writesetId: string;
  createdAt: ISODateTime;
  origin: { actor: string; pipeline: string; runId: string };
  scope?: { allowDomains: CogDomain[]; denyDomains: ['RG'] };
  ops: CogWriteOp[];
};

export type CogRejectionError = {
  code: string;
  message: string;
  instancePath?: string;
  schemaPath?: string;
  details?: Record<string, unknown>;
};

export type CogRejectionItem = {
  opId: string;
  status: 'ACCEPTED' | 'REJECTED';
  entityType?: string;
  domain?: string;
  action?: string;
  errors?: CogRejectionError[];
};

export type CogRejectionReport = {
  ok: boolean;
  writesetId: string;
  summary: { receivedOps: number; acceptedOps: number; rejectedOps: number };
  items: CogRejectionItem[];
};
