export interface ConnectorManifest {
  id: string;
  version: number;
  kind: string;
  license_class: string;
  collection_mode: string;
  source_citation_required?: boolean;
  emits: string[];
  entity_types?: string[];
  rate_limits?: {
    rpm?: number;
    rpd?: number;
  };
  policy_refs: string[];
  deterministic_transform?: boolean;
}

export interface CollectionPolicy {
  policy_id: string;
  allowed_classes: string[];
  restricted_entities?: string[];
}

export interface EntityValidTime {
  start: string | null;
  end: string | null;
}

export interface NormalizedEntity {
  entity_id: string;
  entity_type: string;
  canonical_name: string;
  aliases: string[];
  attributes: Record<string, any>;
  source_refs: string[];
  confidence: number;
  valid_time: EntityValidTime;
}

export interface NormalizedRelationship {
  relationship_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  attributes?: Record<string, any>;
  source_refs: string[];
  confidence: number;
  valid_time: EntityValidTime;
}

export interface PolicyContext {
  applied_policy: string;
  license_class: string;
}

export interface RawAcquisitionEnvelope {
  acquisition_id: string;
  connector_id: string;
  target: string;
  payload_hash: string;
  payload: Record<string, any>;
  policy_context: PolicyContext;
}

export interface TransformationStep {
  step_id: string;
  input_refs: string[];
  output_refs: string[];
  transformer_id: string;
  transformer_version: number;
  parameters?: Record<string, any>;
}

export interface TransformationLineage {
  lineage_id: string;
  investigation_run_id: string;
  steps: TransformationStep[];
}
