export type EvidenceBase = {
  spec: string;
  control_id: string;
  event_type: string;
  occurred_at: string;
  trace_id?: string;
  request_id?: string;
  actor?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type AttestationResult = "PASS" | "FAIL" | "UNKNOWN";

export type Attestation = {
  attestation_id: string;
  control_id: string;
  result: AttestationResult;
  evaluated_at: string;
  inputs_hash: string;
  prev_hash?: string;
  hash: string;
  evidence_ref?: {
    trace_id?: string;
    request_id?: string;
  };
  reasons?: string[];
};
