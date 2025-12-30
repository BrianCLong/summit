export type NodeRow = { id: string; label: string; kind: string; score: number };
export type EdgeRow = { id: string; src: string; dst: string; kind: string; weight: number };

export type ReceiptV01 = {
  schemaVersion: "urn:summit:Receipt:v0.1";
  receiptId: string;
  ts: string;
  actor: { id: string; type: "user" | "service" };
  action: string;
  inputs: Array<{ kind: "text" | "url" | "file" | "record"; ref: string; meta?: Record<string, unknown> }>;
  outputs: Array<{ kind: "doc" | "node" | "edge" | "policyDecision"; ref: string; meta?: Record<string, unknown> }>;
  hashes: { inputSha256: string; outputSha256?: string };
  notes?: string;
};

export type PolicyDecisionV01 = {
  schemaVersion: "urn:summit:PolicyDecision:v0.1";
  decisionId: string;
  ts: string;
  policy: { id: string; version: string };
  result: "allow" | "deny" | "allow_with_obligations";
  reasons: string[];
  obligations: Array<{ type: string; params?: Record<string, unknown> }>;
  receiptRef: string;
};
