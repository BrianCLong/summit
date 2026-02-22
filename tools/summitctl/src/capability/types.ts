export type CapabilityMatcher = {
  type: 'mcp_tool' | 'http_endpoint';
  server?: string;
  tool?: string;
  method?: string;
  path?: string;
};

export type CapabilitySpec = {
  capability_id: string;
  name: string;
  description: string;
  business_domain: string;
  owner_team: string;
  oncall?: string;
  repo: string;
  service: string;
  data_classification: string;
  allowed_identities: string[];
  authn?: Record<string, unknown>;
  authz?: Record<string, unknown>;
  schemas: {
    input_schema_ref?: string;
    output_schema_ref?: string;
  };
  operations: string[];
  risk_controls: {
    rate_limit?: { max_per_minute?: number };
    approvals_required?: boolean;
    redaction_fields?: string[];
    allowlist_fields?: string[];
  };
  dependency_edges?: Array<{
    type: string;
    target: string;
    description?: string;
  }>;
  policy_refs?: string[];
  matchers?: CapabilityMatcher[];
};

export type CapabilityRegistry = {
  version: number;
  capabilities: CapabilitySpec[];
};

export type InventoryEntry = {
  id: string;
  name: string;
  type: string;
  source: string;
  version?: string;
  servers?: string[];
  capability_id?: string;
  operations?: number;
};

export type GraphNode = {
  id: string;
  type: 'capability' | 'service' | 'dataset' | 'inventory';
  label?: string;
  metadata?: Record<string, unknown>;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: string;
  metadata?: Record<string, unknown>;
};
