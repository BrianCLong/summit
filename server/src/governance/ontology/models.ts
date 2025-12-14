
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
