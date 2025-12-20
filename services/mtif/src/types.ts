export type StixIdentifierPrefix =
  | 'attack-pattern'
  | 'identity'
  | 'indicator'
  | 'relationship'
  | 'extension-definition';

export interface StixCommon {
  type: string;
  id: string;
  spec_version: '2.1';
  created: string;
  modified: string;
  description?: string;
  confidence?: number;
  created_by_ref?: string;
  external_references?: Array<{
    source_name: string;
    url?: string;
    external_id?: string;
    description?: string;
  }>;
  labels?: string[];
}

export interface AttackPattern extends StixCommon {
  type: 'attack-pattern';
  name: string;
  kill_chain_phases?: Array<{
    kill_chain_name: string;
    phase_name: string;
  }>;
  extensions?: Record<string, unknown>;
}

export interface Indicator extends StixCommon {
  type: 'indicator';
  name: string;
  pattern: string;
  pattern_type: string;
  valid_from: string;
  extensions?: Record<string, unknown>;
}

export interface Relationship extends StixCommon {
  type: 'relationship';
  relationship_type: string;
  source_ref: string;
  target_ref: string;
}

export interface Identity extends StixCommon {
  type: 'identity';
  name: string;
  identity_class: string;
  roles?: string[];
  sectors?: string[];
}

export interface ExtensionDefinition extends StixCommon {
  type: 'extension-definition';
  name: string;
  description: string;
  schema: string;
  version: string;
  extension_types: string[];
  extension_properties: string[];
}

export type StixObject =
  | AttackPattern
  | Indicator
  | Relationship
  | Identity
  | ExtensionDefinition;

export interface StixBundle {
  type: 'bundle';
  id: string;
  spec_version: '2.1';
  objects: StixObject[];
}

export type ThreatCategory = 'attack-prompt' | 'jailbreak-pattern' | 'tool-abuse';

export interface LlmThreat {
  id: string;
  category: ThreatCategory;
  title: string;
  description: string;
  llm_family: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  observed_at: string;
  metadata?: Record<string, unknown>;
}

export interface LrtFinding {
  prompt: string;
  llm_family: string;
  jailbreak?: string;
  tool?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  observed_at: string;
  response_summary?: string;
  notes?: string;
}

export interface LrtRun {
  id: string;
  name: string;
  executed_at: string;
  operator: string;
  findings: LrtFinding[];
}

export interface GuardRuleUpdate {
  id: string;
  framework: 'PPC' | 'RSR';
  version: string;
  generated_at: string;
  rules: Array<{
    id: string;
    description: string;
    payload: Record<string, unknown>;
  }>;
  signature: string;
}

export interface CollectionRecord {
  id: string;
  title: string;
  description: string;
  alias: string;
  can_read: boolean;
  can_write: boolean;
}

export interface PaginatedResult<T> {
  objects: T[];
  next?: string;
  more: boolean;
}

export interface ObjectQueryOptions {
  limit?: number;
  next?: string;
  added_after?: string;
  match?: Record<string, string>;
}

export interface TaxiiDiscoveryDocument {
  title: string;
  description: string;
  contact: string;
  default: string;
  api_roots: string[];
}

export interface TaxiiApiRootInformation {
  title: string;
  description: string;
  versions: string[];
  max_content_length: number;
}
