
export interface Concept {
  id: string;
  term: string;
  description: string;
  semanticType: string;
  aliases: string[];
  deprecated: boolean;
  supersedes: string[];
  supersededBy?: string;
}

export interface Vocabulary {
  id: string;
  name: string;
  description: string;
  concepts: Concept[];
  version: string;
}

export interface FieldDefinition {
  name: string;
  type: string;
  description: string;
  required: boolean;
  sensitive: boolean;
  pii: boolean;
  validationRule?: string;
}

export interface EntityDefinition {
  name: string;
  description: string;
  fields: FieldDefinition[];
  constraints: string[];
}

export interface EdgeDefinition {
  name: string;
  description: string;
  sourceType: string;
  targetType: string;
  fields: FieldDefinition[];
}

export interface SchemaDefinition {
  entities: EntityDefinition[];
  edges: EdgeDefinition[];
}

export type SchemaStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ACTIVE' | 'DEPRECATED';

export interface SchemaVersion {
  id: string;
  version: string;
  definition: SchemaDefinition;
  changelog: string;
  status: SchemaStatus;
  createdAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  author: string;
  status: 'OPEN' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'MERGED';
  proposedChanges: {
    type: 'ADD_ENTITY' | 'MODIFY_ENTITY' | 'ADD_FIELD' | 'MODIFY_FIELD' | 'DEPRECATE_ENTITY' | 'ADD_VOCAB' | 'MODIFY_VOCAB';
    targetId: string; // Entity or Vocab ID
    payload: any;
  }[];
  comments: {
    author: string;
    message: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Execution & Runtime Extensions ---

export interface TemporalScope {
  validFrom: Date;
  validTo?: Date; // If undefined, assumed current/ongoing
}

export interface ProbabilisticMetadata {
  confidence: number; // 0.0 to 1.0
  source: string; // Agent ID, User ID, or System Process
  method?: string; // e.g., "inference", "extraction", "user-input"
}

export interface OntologyAssertion {
  id: string;
  entityType: string; // matches EntityDefinition.name
  entityId: string;
  property: string; // matches FieldDefinition.name
  value: any;

  // Metadata
  temporal: TemporalScope;
  probabilistic: ProbabilisticMetadata;
  provenance: {
      derivedFrom?: string[]; // IDs of other assertions
      ruleId?: string; // If inferred, which rule?
  };
}

export interface InferenceResult {
    assertions: OntologyAssertion[];
    explanation?: string; // Human readable explanation
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
