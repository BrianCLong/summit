export type ConnectorKind = 'source' | 'destination' | 'bi-directional';
export type IdempotencySemantics = 'at-least-once' | 'exactly-once';

export interface RateLimitConfig {
  requests: number;
  period_ms: number;
}

export interface ConnectorContract {
  identity: {
    name: string;
    version: string;
    kind: ConnectorKind;
    owner: string;
  };
  capabilities: {
    read_scopes: string[];
    write_scopes: string[];
    rate_limits: Record<string, RateLimitConfig>;
    supported_entities: string[];
  };
  idempotency: {
    required_keys: string[];
    semantics: IdempotencySemantics;
  };
  errors: {
    standard_codes_mapping: Record<string, string>;
  };
  evidence: {
    required_artifacts: string[];
  };
  redaction: {
    declared_sensitive_fields: string[];
  };
}
