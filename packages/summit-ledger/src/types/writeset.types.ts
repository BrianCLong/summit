import type { BitemporalWindow } from "./bitemporal.types";
import type { ProvenanceBundle } from "./provenance.types";

export type GraphKind = "RG" | "BG" | "NG";

export interface ClaimRecord {
  claim_id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  time: BitemporalWindow;
  evidence_ids: string[];
}

export interface UpsertClaimOp {
  op: "UPSERT_CLAIM";
  graph: GraphKind;
  claim: ClaimRecord;
}

export interface PromotionProposal {
  promotion_id: string;
  claim_id: string;
  from_graph: "BG" | "NG";
  to_graph: "RG";
}

export interface ProposePromotionOp {
  op: "PROPOSE_PROMOTION";
  promotion: PromotionProposal;
}

export type WriteOp = UpsertClaimOp | ProposePromotionOp;

export interface WriteSet {
  writeset_id: string;
  system_time: string;
  source: string;
  ops: WriteOp[];
  provenance: ProvenanceBundle;
}

export function isUpsertClaimOp(op: WriteOp): op is UpsertClaimOp {
  return op.op === "UPSERT_CLAIM";
}
