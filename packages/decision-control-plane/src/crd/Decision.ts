export type DecisionPhase =
  | "Pending"
  | "Admitted"
  | "Blocked"
  | "Ready"
  | "Executed";

export interface DecisionSpec {
  decisionId: string;
  intent: string;
  actionRef?: string;
  evidenceIds: string[];
  riskTier: "low" | "medium" | "high";
  policyProfile: string;
}

export interface DecisionStatus {
  phase: DecisionPhase;
  allowed: boolean;
  trustScore: number;
  riskScore: number;
  conditions: Array<{ type: string; status: "True" | "False"; reason: string }>;
}

export interface DecisionResource {
  apiVersion: string;
  kind: "Decision";
  metadata: {
    name: string;
  };
  spec: DecisionSpec;
  status: DecisionStatus;
}
