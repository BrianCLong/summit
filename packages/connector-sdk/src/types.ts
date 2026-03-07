export type LicenseClass = "public" | "commercial" | "restricted";
export type CollectionMode = "api" | "file" | "scrape" | "manual";
export type PolicyVerdict = "allow" | "deny";

export interface ConnectorManifest {
  id: string;
  name: string;
  version: string;
  kind: "osint-connector";
  owner: string;
  license_class: LicenseClass;
  collection_mode: CollectionMode;
  deterministic: boolean;
  input_schema: string;
  output_schema: string;
  rate_limit: {
    rps: number;
    burst: number;
  };
  policy_refs: string[];
  entity_mappings: Array<{
    from: string;
    to: string;
  }>;
  evidence: {
    capture_raw: boolean;
    capture_transform_hash: boolean;
    capture_source_metadata: boolean;
  };
}

export interface ConnectorInput {
  [key: string]: unknown;
}

export interface NormalizedEntity {
  entity_id: string;
  entity_type: string;
  canonical_value: string;
  display_name: string;
  confidence: number;
  source_refs: string[];
  attributes?: Record<string, unknown>;
}

export interface NormalizedEdge {
  edge_id: string;
  edge_type: string;
  from: string;
  to: string;
  confidence: number;
  source_refs: string[];
  attributes?: Record<string, unknown>;
}

export interface ConnectorOutput {
  run_id: string;
  connector_id: string;
  input: ConnectorInput;
  raw_ref: string;
  entities: NormalizedEntity[];
  edges: NormalizedEdge[];
  observations: Array<Record<string, unknown>>;
  source_metadata: {
    provider: string;
    license_class: LicenseClass;
  };
  transform_hash: string;
  policy_verdict: PolicyVerdict;
}

export interface EvidenceArtifact {
  connector_id: string;
  run_id: string;
  input_hash: string;
  raw_hash: string;
  output_hash: string;
  transform_hash: string;
  policy_verdict: PolicyVerdict;
}
