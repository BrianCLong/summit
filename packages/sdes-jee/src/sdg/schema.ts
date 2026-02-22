export type NodeKind =
  | "DATASET"
  | "SYSTEM"
  | "AI_WORKLOAD"
  | "JURISDICTION"
  | "SOVEREIGN_STORE"
  | "REGULATOR_OR_AGENCY"
  | "VENDOR_PROCESSOR"
  | "KMS_DOMAIN";

export type EdgeKind =
  | "STORED_IN"
  | "REPLICATED_TO"
  | "TRANSFERRED_TO"
  | "PROCESSED_BY"
  | "KEYS_HELD_IN"
  | "SUBJECT_TO_REGIME"
  | "AGENCY_CAN_ACCESS"
  | "INFO_SHARING_WITH"
  | "DERIVES_FROM";

export type DataClass =
  | "TRADE_SECRET"
  | "SENSITIVE_PERSONAL"
  | "FINANCIAL"
  | "TAX"
  | "CUSTOMS_TRADE"
  | "TELEMETRY"
  | "GENERIC";

export interface IntelligenceYieldVector {
  // v0: coarse, auditable dimensions (0..1)
  trade_secret_inference: number;
  supply_chain_reconstruction: number;
  sensitive_profile_risk: number;
  operational_pattern_leak: number;
}

export interface Node {
  id: string;
  kind: NodeKind;
  label: string;              // avoid PII in fixtures
  data_class?: DataClass;
  sensitivity: 0 | 1 | 2 | 3 | 4 | 5;
  tags: string[];             // e.g. ["TENANT:x", "JURIS:US", "REGIME:DSP"]
}

export interface Edge {
  id: string;
  src: string;
  dst: string;
  kind: EdgeKind;
  weight: number;             // deterministic risk weight in fixtures
  legal_powers?: string[];    // e.g. ["AUDIT_ACCESS","CUSTOMS_MANIFEST_ACCESS"]
  ai_capabilities?: string[]; // e.g. ["GRAPH_JOIN","ANOMALY_DETECT","OSINT_LINK"]
  tags: string[];             // provenance and policy capsule ids
}

export interface SdgSnapshot {
  version: string; // policy hash; no timestamps
  nodes: Node[];
  edges: Edge[];
}
