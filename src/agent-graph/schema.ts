export type RiskTier = "low" | "medium" | "high";
export type CapabilityNodeKind =
  | "agent"
  | "tool"
  | "workflow"
  | "policy"
  | "artifact"
  | "dataset";

export interface CapabilityNode {
  id: string;
  kind: CapabilityNodeKind;
  riskTier: RiskTier;
  requiresEvidence: boolean;
  tags: string[];
}

export interface CapabilityEdge {
  id: string;
  from: string;
  to: string;
  allow: boolean; // deny-by-default; compiler should reject absent edges
  requiredChecks: string[];
  evidenceKinds: string[];
  maxCostUsd?: number;
  maxLatencyMs?: number;
}

export interface CapabilityGraph {
  version: string;
  nodes: CapabilityNode[];
  edges: CapabilityEdge[];
}
