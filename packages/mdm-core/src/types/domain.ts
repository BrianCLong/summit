/**
 * Multi-Domain MDM Types
 */

export interface Domain {
  id: string;
  name: string;
  description: string;
  type: DomainType;
  schema: DomainSchema;
  governancePolicy: GovernancePolicy;
  relationships: DomainRelationship[];
  stewards: Steward[];
  qualityRules: QualityRule[];
  matchingRules: MatchingRule[];
  survivorshipRules: SurvivorshipRule[];
  metadata: DomainMetadata;
}

export type DomainType =
  | 'customer'
  | 'product'
  | 'location'
  | 'organization'
  | 'employee'
  | 'asset'
  | 'financial_instrument'
  | 'supplier'
  | 'partner'
  | 'custom';

export interface DomainSchema {
  attributes: DomainAttribute[];
  requiredFields: string[];
  uniqueKeys: string[][];
  indexes: Index[];
  validationRules: ValidationRule[];
}

export interface DomainAttribute {
  name: string;
  type: AttributeType;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  description?: string;
  defaultValue?: unknown;
  constraints?: AttributeConstraint[];
  sensitive: boolean;
  pii: boolean;
}

export type AttributeType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'json'
  | 'reference'
  | 'array'
  | 'enum';

export interface AttributeConstraint {
  type: 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'enum' | 'custom';
  value: unknown;
  errorMessage?: string;
}

export interface Index {
  name: string;
  fields: string[];
  unique: boolean;
  sparse: boolean;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  ruleType: 'field' | 'record' | 'cross_field' | 'business';
  severity: 'error' | 'warning' | 'info';
  expression: string;
  errorMessage: string;
  active: boolean;
}

export interface DomainRelationship {
  id: string;
  targetDomain: string;
  relationshipType: RelationshipType;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  attributes: string[];
  cascadeDelete: boolean;
  cascadeUpdate: boolean;
}

export type RelationshipType =
  | 'parent_child'
  | 'reference'
  | 'association'
  | 'composition'
  | 'aggregation';

export interface GovernancePolicy {
  dataOwner: string;
  stewards: string[];
  accessControl: AccessControlPolicy;
  changeManagement: ChangeManagementPolicy;
  qualityThreshold: number;
  certificationRequired: boolean;
  retentionPolicy: RetentionPolicy;
  privacyPolicy: PrivacyPolicy;
}

export interface AccessControlPolicy {
  roles: AccessRole[];
  permissions: Permission[];
  defaultAccess: 'deny' | 'read' | 'write' | 'admin';
}

export interface AccessRole {
  name: string;
  permissions: string[];
  users: string[];
  groups: string[];
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'certify' | 'approve';
  conditions?: Record<string, unknown>;
}

export interface ChangeManagementPolicy {
  approvalRequired: boolean;
  approvers: string[];
  minApprovals: number;
  autoApproveThreshold?: number;
  auditTrail: boolean;
}

export interface RetentionPolicy {
  retentionPeriod: number;
  retentionUnit: 'days' | 'months' | 'years';
  archiveStrategy: 'delete' | 'archive' | 'anonymize';
  legalHoldEnabled: boolean;
}

export interface PrivacyPolicy {
  piiFields: string[];
  encryptionRequired: boolean;
  maskingRules: MaskingRule[];
  consentRequired: boolean;
  rightToErasure: boolean;
}

export interface MaskingRule {
  field: string;
  maskingType: 'full' | 'partial' | 'hash' | 'tokenize' | 'custom';
  pattern?: string;
  customFunction?: (value: string) => string;
}

export interface Steward {
  userId: string;
  name: string;
  email: string;
  role: StewardRole;
  domains: string[];
  responsibilities: string[];
  delegateUserId?: string;
}

export type StewardRole = 'data_steward' | 'domain_steward' | 'quality_steward' | 'chief_steward';

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  ruleType: QualityRuleType;
  dimension: QualityDimension;
  severity: 'critical' | 'high' | 'medium' | 'low';
  threshold: number;
  expression: string;
  active: boolean;
}

export type QualityRuleType =
  | 'completeness'
  | 'accuracy'
  | 'consistency'
  | 'validity'
  | 'uniqueness'
  | 'timeliness'
  | 'conformity';

export type QualityDimension =
  | 'completeness'
  | 'accuracy'
  | 'consistency'
  | 'validity'
  | 'uniqueness'
  | 'timeliness';

export interface MatchingRule {
  id: string;
  name: string;
  description: string;
  algorithm: MatchingAlgorithm;
  threshold: number;
  weight: number;
  fields: MatchingField[];
  blockingStrategy?: BlockingStrategy;
  active: boolean;
}

export type MatchingAlgorithm =
  | 'exact'
  | 'levenshtein'
  | 'jaro_winkler'
  | 'soundex'
  | 'metaphone'
  | 'token_based'
  | 'ml_model'
  | 'custom';

export interface MatchingField {
  fieldName: string;
  weight: number;
  comparator: string;
  transformations?: string[];
}

export interface BlockingStrategy {
  blockingKeys: string[];
  maxBlockSize: number;
}

export interface SurvivorshipRule {
  id: string;
  fieldName: string;
  strategy: SurvivorshipStrategy;
  priority: number;
  sourcePreferences?: string[];
  customLogic?: string;
}

export type SurvivorshipStrategy =
  | 'most_recent'
  | 'most_complete'
  | 'most_trusted_source'
  | 'most_frequent'
  | 'highest_quality'
  | 'longest'
  | 'custom';

export interface DomainMetadata {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
  recordCount: number;
  avgQualityScore: number;
  tags: string[];
  customAttributes: Record<string, unknown>;
}
