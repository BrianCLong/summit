
/**
 * Canonical Graph Data Model Types
 */

export type EntityType =
  | 'Actor'
  | 'Organization'
  | 'Asset'
  | 'Document'
  | 'Run'
  | 'Task'
  | 'Experiment'
  | 'Policy'
  | 'Incident'
  | 'Event'
  | 'IntegrationInstance'
  | 'ModelProfile'
  | 'Signal'
  | 'Tag';

export type EdgeType =
  | 'USES'
  | 'OWNS'
  | 'MEMBER_OF'
  | 'RUN_OF'
  | 'RUN_CONTAINS_TASK'
  | 'TASK_DEPENDS_ON'
  | 'DERIVED_FROM'
  | 'REFERENCES'
  | 'RAISED_INCIDENT'
  | 'GOVERNED_BY'
  | 'RELATES_TO'
  | 'SIMILAR_TO'
  | 'PART_OF';

export type EpistemicStatus =
  | 'observed_fact'
  | 'reported_claim'
  | 'inferred_hypothesis'
  | 'derived_metric'
  | 'disputed'
  | 'deprecated';

export type RiskClassification = 'benign' | 'sensitive' | 'highly_sensitive';

export interface EpistemicMetadata {
  status: EpistemicStatus;
  confidence: number; // 0.0 - 1.0
  sourceTrust: number; // 0.0 - 1.0
  recencyScore: number; // 0.0 - 1.0
  riskClassification: RiskClassification;
}

export interface SourceReference {
  provider: string; // e.g. 'github', 'pagerduty', 'maestro'
  externalId: string;
  url?: string;
  ingestedAt: string; // ISO8601
}

export interface GraphEntity {
  globalId: string;
  tenantId: string;
  entityType: EntityType;
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  validFrom: string; // ISO8601
  validTo?: string; // ISO8601, null/undefined means currently valid
  sourceRefs: SourceReference[];
  epistemic: EpistemicMetadata;
  attributes: Record<string, any>; // Flexible typed attributes
}

export interface GraphEdge {
  id: string; // Unique edge ID
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  tenantId: string;
  createdAt: string;
  validFrom: string;
  validTo?: string;
  attributes: Record<string, any>; // weight, etc.
  sourceRefs: SourceReference[];
  epistemic?: EpistemicMetadata;
}

// Specific Node Interfaces (extending GraphEntity implies they have the base fields)
// We use a discriminated union pattern or just interface extensions.
// For Neo4j, these map to Labels and Properties.

export interface ActorNode extends GraphEntity {
  entityType: 'Actor';
  attributes: {
    name: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
}

export interface OrganizationNode extends GraphEntity {
  entityType: 'Organization';
  attributes: {
    name: string;
    domain?: string;
    [key: string]: any;
  };
}

export interface AssetNode extends GraphEntity {
  entityType: 'Asset';
  attributes: {
    name: string;
    assetType: 'repo' | 'service' | 'environment' | 'endpoint' | 'dataset' | 'model';
    uri?: string;
    [key: string]: any;
  };
}

export interface DocumentNode extends GraphEntity {
  entityType: 'Document';
  attributes: {
    title: string;
    docType: 'spec' | 'ticket' | 'pr' | 'design_doc' | 'runbook' | 'wiki' | 'notebook';
    uri?: string;
    contentSummary?: string;
    [key: string]: any;
  };
}

export interface RunNode extends GraphEntity {
  entityType: 'Run';
  attributes: {
    runId: string; // Maestro run ID
    status: string;
    goal?: string;
    [key: string]: any;
  };
}

export interface TaskNode extends GraphEntity {
  entityType: 'Task';
  attributes: {
    taskId: string;
    name: string;
    status: string;
    [key: string]: any;
  };
}

// ... other types mapped similarly
