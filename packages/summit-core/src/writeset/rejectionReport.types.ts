export type RejectionCode =
  | "SCHEMA_VALIDATION_FAILED"
  | "PROMOTION_INSUFFICIENT_EVIDENCE"
  | "PROMOTION_MISSING_PRIMARY_EVIDENCE"
  | "PROMOTION_SOURCE_GRAPH_INVALID"
  | "PROMOTION_CLAIM_NOT_FOUND";

export interface RejectionDetail {
  code: RejectionCode;
  message: string;
  path?: string;
  evidence_expected?: string[];
  evidence_found?: string[];
}

export interface RejectionReport {
  writeset_id: string;
  system_time: string;
  accepted: boolean;
  details: RejectionDetail[];
}
