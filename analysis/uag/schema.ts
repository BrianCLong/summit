// analysis/uag/schema.ts
import { NodeKind } from "./node-kinds.js";
import { EdgeKind } from "./edge-kinds.js";

// Canonical evidence ID pattern
// EVID::<artifact_family>::<source>::<stable_subject>::<seq>
export type EvidenceId = string;

export interface EvidenceEnvelope {
  id: EvidenceId;
  family: "container" | "python" | "terraform" | "model";
  source: string;
  subject: string;
  seq: string;
  payload: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  properties: Record<string, unknown>;
  evidenceIds: EvidenceId[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  properties: Record<string, unknown>;
  evidenceIds: EvidenceId[];
}

export interface UniversalAssuranceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Deterministic artifacts
export interface ReportFinding {
  id: string;
  kind: string;
  message: string;
  affectedNodes: string[];
}

export interface ReportArtifact {
  schemaVersion: string;
  findings: ReportFinding[];
}

export interface MetricsArtifact {
  schemaVersion: string;
  counts: Record<string, number>;
  confidenceBuckets: Record<string, number>;
}

export interface StampArtifact {
  schemaVersion: string;
  connectorVersions: Record<string, string>;
  fixtureDigests: Record<string, string>;
}
