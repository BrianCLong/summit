export type UUID = string;

export type GraphDomain = "RG" | "BG" | "NG" | "QG"; // Reality, Belief, Narrative, Quarantine

export type ArtifactRef = {
  kind: "evidence" | "claim" | "belief" | "narrative" | "source";
  id: UUID;
};

export type WriteOp =
  | { op: "upsert_node"; domain: GraphDomain; kind: ArtifactRef["kind"]; id: UUID; data: Record<string, unknown> }
  | { op: "upsert_edge"; domain: GraphDomain; kind: "supports" | "contradicts" | "mentions" | "believes"; from: ArtifactRef; to: ArtifactRef; data?: Record<string, unknown> };

export type WriteSetEnvelope = {
  writeset_id: UUID;
  created_at: string; // ISO
  actor: { kind: "system" | "user" | "agent"; id: string };
  intent: "ingest" | "analysis" | "repair";
  ops: WriteOp[];
  meta?: Record<string, unknown>;
};

// Firewall results (AJV + SV) you already have a version of:
export type RejectionReport = {
  disposition: "reject";
  writeset_id: UUID;
  reasons: Array<{ code: string; message: string; path?: string }>;
};

// EIS results:
export type QuarantineReport = {
  disposition: "quarantine";
  writeset_id: UUID;
  quarantine_case_id: UUID;
  signals_triggered: Array<{ code: string; score: number; detail?: Record<string, unknown> }>;
  missing_requirements: Array<{ code: string; message: string }>;
  recommended_next_evidence: Array<{ hint: string; query?: string }>;
  affected_artifacts: ArtifactRef[];
};

export type AllowReport = {
  disposition: "allow" | "allow_with_flags";
  writeset_id: UUID;
  flags?: Array<{ code: string; score: number; detail?: Record<string, unknown> }>;
};

export type WriteDecision = RejectionReport | QuarantineReport | AllowReport;
