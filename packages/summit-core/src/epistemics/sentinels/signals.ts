export type Signal = {
  code:
    | "burst_velocity"
    | "low_evidence_density"
    | "provenance_anomaly"
    | "coordination_fingerprint"
    | "schema_evasion_attempt";
  score: number; // 0..1
  detail?: Record<string, unknown>;
};

export type SentinelConfig = {
  burstWindowSec: number;
  burstThreshold: number;
  minEvidenceLinks: number;
  provenanceRequiredFields: string[];
  quarantineScoreThreshold: number; // >= triggers quarantine
  allowWithFlagsThreshold: number; // >= triggers allow_with_flags
};
