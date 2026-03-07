import type { UUID, ArtifactRef, WriteSetEnvelope } from "../../writeset/types.js";

export type QuarantineDisposition = "open" | "resolved_allow" | "resolved_reject";

export type QuarantineCase = {
  quarantine_case_id: UUID;
  created_at: string; // ISO 8601
  status: QuarantineDisposition;

  writeset: WriteSetEnvelope;

  signals: Array<{ code: string; score: number; detail?: Record<string, unknown> }>;
  missing_requirements: Array<{ code: string; message: string }>;
  recommended_next_evidence: Array<{ hint: string; query?: string }>;

  affected_artifacts: ArtifactRef[];
};
