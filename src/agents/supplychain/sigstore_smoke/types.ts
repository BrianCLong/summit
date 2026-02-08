export type EvidenceId = `SIGSTORE:${string}`;

export type FailureMode =
  | 'COSIGN_MISMATCH_ACCEPTED'
  | 'REKOR_500_NOT_FAIL_CLOSED'
  | 'UNKNOWN';

export interface SmokeCaseResult {
  id: EvidenceId;
  ok: boolean;
  failure_mode?: FailureMode;
  details: Record<string, unknown>;
}

export interface SmokeReport {
  schema: 'summit.sigstore.smoke.v1';
  results: SmokeCaseResult[];
}

export interface SmokeCaseObservation {
  ok: boolean;
  failure_mode?: FailureMode;
  details?: Record<string, unknown>;
}

export interface SmokeCaseInput {
  id: EvidenceId;
  description: string;
  expectedFailureMode?: FailureMode;
  execute: () => Promise<SmokeCaseObservation> | SmokeCaseObservation;
}
