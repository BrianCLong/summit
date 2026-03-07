export type SignalCode =
  | "burst_velocity"
  | "low_evidence_density"
  | "provenance_anomaly"
  | "coordination_fingerprint"
  | "schema_evasion_attempt";

export type Signal = {
  code: SignalCode;
  score: number; // 0..1
  detail?: Record<string, unknown>;
};

export type SentinelConfig = {
  /** Rolling window used by burst counting (seconds) */
  burstWindowSec: number;
  /** Replication count threshold that triggers burst_velocity */
  burstThreshold: number;
  /** Minimum evidence links required for a claim node */
  minEvidenceLinks: number;
  /** Provenance fields that must be present and non-empty on every evidence node */
  provenanceRequiredFields: string[];
  /** Aggregate signal score at or above which a writeset is quarantined */
  quarantineScoreThreshold: number;
  /** Aggregate signal score at or above which allow_with_flags is returned */
  allowWithFlagsThreshold: number;
};
