/**
 * Master Data Management Types
 * Comprehensive type definitions for MDM operations including golden records,
 * entity matching, merging, hierarchies, and data stewardship workflows.
 */

import { z } from 'zod';

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Represents a domain in multi-domain MDM (e.g., Customer, Product, Location)
 */
export type MDMDomain =
  | 'customer'
  | 'product'
  | 'location'
  | 'employee'
  | 'supplier'
  | 'asset'
  | string; // Allow custom domains

/**
 * Source system information for tracking data lineage
 */
export interface SourceSystem {
  systemId: string;
  systemName: string;
  systemType: string;
  priority: number; // Used for survivorship rules (higher = more trusted)
  lastSyncDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Individual source record before merging into golden record
 */
export interface SourceRecord<T = Record<string, unknown>> {
  recordId: string;
  sourceSystem: SourceSystem;
  domain: MDMDomain;
  data: T;
  confidence: number; // 0-1 confidence score in data quality
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Golden Record - the single source of truth for an entity
 * Created by merging multiple source records
 */
export interface GoldenRecord<T = Record<string, unknown>> {
  goldenId: string;
  domain: MDMDomain;
  masterData: T;
  sourceRecords: SourceRecord<T>[];
  matchScore?: number; // Confidence score for the merge
  survivorshipRules: SurvivorshipRule[];
  version: number;
  status: RecordStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Status of a master data record
 */
export type RecordStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'archived'
  | 'merged'
  | 'split';

// ============================================================================
// Entity Matching Types
// ============================================================================

/**
 * Types of matching algorithms
 */
export type MatchAlgorithm =
  | 'exact'
  | 'fuzzy'
  | 'phonetic'
  | 'levenshtein'
  | 'jaro_winkler'
  | 'ngram'
  | 'custom';

/**
 * Configuration for a single matching rule
 */
export interface MatchRule {
  ruleId: string;
  name: string;
  domain: MDMDomain;
  fields: MatchField[];
  algorithm: MatchAlgorithm;
  threshold: number; // Minimum match score (0-1) to consider a match
  weight: number; // Weight of this rule in overall matching (0-1)
  blocking?: BlockingKey[]; // Pre-filter candidates for performance
  enabled: boolean;
  priority: number; // Execution order
  metadata?: Record<string, unknown>;
}

/**
 * Field configuration for matching
 */
export interface MatchField {
  fieldName: string;
  weight: number; // Importance of this field (0-1)
  algorithm: MatchAlgorithm;
  caseSensitive?: boolean;
  normalizeWhitespace?: boolean;
  removeSpecialChars?: boolean;
  phoneticAlgorithm?: 'soundex' | 'metaphone' | 'double_metaphone';
  threshold?: number; // Field-specific threshold
}

/**
 * Blocking key for pre-filtering match candidates
 */
export interface BlockingKey {
  fields: string[];
  transform?: 'lowercase' | 'uppercase' | 'first_n_chars' | 'phonetic';
  length?: number; // For first_n_chars transform
}

/**
 * Result of matching two records
 */
export interface MatchResult {
  record1Id: string;
  record2Id: string;
  matchScore: number; // Overall match score (0-1)
  fieldScores: FieldMatchScore[];
  matchType: MatchType;
  confidence: number; // Statistical confidence in the match
  rulesMatched: string[]; // IDs of rules that matched
  createdAt: Date;
  reviewRequired?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Match score for individual field
 */
export interface FieldMatchScore {
  fieldName: string;
  score: number;
  algorithm: MatchAlgorithm;
  value1?: unknown;
  value2?: unknown;
}

/**
 * Type of match found
 */
export type MatchType =
  | 'exact'
  | 'probable'
  | 'possible'
  | 'no_match';

// ============================================================================
// Merging and Survivorship Types
// ============================================================================

/**
 * Strategy for merging duplicate records
 */
export interface MergeStrategy {
  strategyId: string;
  name: string;
  domain: MDMDomain;
  survivorshipRules: SurvivorshipRule[];
  conflictResolution: ConflictResolutionStrategy;
  requiresApproval: boolean;
  autoMergeThreshold?: number; // Auto-merge if match score >= threshold
  metadata?: Record<string, unknown>;
}

/**
 * Rule for determining which value survives in a merge
 */
export interface SurvivorshipRule {
  ruleId: string;
  fieldName: string;
  priority: number; // Execution order
  strategy: SurvivorshipStrategy;
  conditions?: SurvivorshipCondition[];
  customFunction?: string; // Reference to custom logic
  metadata?: Record<string, unknown>;
}

/**
 * Survivorship strategies
 */
export type SurvivorshipStrategy =
  | 'most_recent' // Most recently updated value
  | 'most_complete' // Value with most data
  | 'most_frequent' // Most common value across sources
  | 'highest_quality' // From highest quality source
  | 'source_priority' // Based on source system priority
  | 'longest' // Longest string value
  | 'highest_value' // Highest numeric value
  | 'lowest_value' // Lowest numeric value
  | 'concatenate' // Combine all values
  | 'custom'; // Custom logic

/**
 * Condition for applying survivorship rule
 */
export interface SurvivorshipCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: unknown;
}

/**
 * Strategy for resolving conflicts during merge
 */
export type ConflictResolutionStrategy =
  | 'automatic' // Use survivorship rules
  | 'manual' // Require human review
  | 'hybrid'; // Auto for high confidence, manual for low

/**
 * Result of merging records
 */
export interface MergeResult<T = Record<string, unknown>> {
  goldenRecord: GoldenRecord<T>;
  sourceRecordIds: string[];
  conflicts: DataConflict[];
  appliedRules: string[];
  requiresReview: boolean;
  confidence: number;
  mergedAt: Date;
  mergedBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Data conflict found during merge
 */
export interface DataConflict {
  fieldName: string;
  values: ConflictValue[];
  resolvedValue?: unknown;
  resolution: 'automatic' | 'manual' | 'pending';
  reason?: string;
}

/**
 * Value in a conflict with its source
 */
export interface ConflictValue {
  value: unknown;
  sourceRecordId: string;
  sourceSystem: string;
  confidence: number;
  lastUpdated: Date;
}

// ============================================================================
// Entity Hierarchy Types
// ============================================================================

/**
 * Type of relationship between entities
 */
export type HierarchyRelationType =
  | 'parent_child'
  | 'part_of'
  | 'owns'
  | 'reports_to'
  | 'member_of'
  | 'located_at'
  | 'supplier_of'
  | 'customer_of'
  | string; // Allow custom types

/**
 * Relationship between two entities
 */
export interface EntityRelationship {
  relationshipId: string;
  relationType: HierarchyRelationType;
  parentId: string;
  childId: string;
  domain: MDMDomain;
  effectiveDate: Date;
  endDate?: Date;
  strength: number; // Strength of relationship (0-1)
  bidirectional: boolean;
  attributes?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Hierarchical structure of entities
 */
export interface EntityHierarchy {
  hierarchyId: string;
  name: string;
  domain: MDMDomain;
  rootEntityId: string;
  depth: number;
  nodes: HierarchyNode[];
  relationType: HierarchyRelationType;
  isActive: boolean;
  effectiveDate: Date;
  endDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Node in an entity hierarchy
 */
export interface HierarchyNode {
  entityId: string;
  level: number;
  parentId?: string;
  children: string[];
  path: string[]; // Full path from root
  isLeaf: boolean;
  attributes?: Record<string, unknown>;
}

/**
 * Configuration for hierarchy validation
 */
export interface HierarchyValidation {
  allowCycles: boolean;
  maxDepth?: number;
  allowMultipleParents: boolean;
  requireRoot: boolean;
  customRules?: string[];
}

// ============================================================================
// Data Stewardship Workflow Types
// ============================================================================

/**
 * Type of stewardship task
 */
export type StewardshipTaskType =
  | 'merge_review'
  | 'conflict_resolution'
  | 'data_quality_issue'
  | 'hierarchy_validation'
  | 'new_record_approval'
  | 'change_approval'
  | 'deduplication'
  | 'enrichment';

/**
 * Priority of stewardship task
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Status of stewardship task
 */
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'escalated';

/**
 * Data stewardship task
 */
export interface StewardshipTask {
  taskId: string;
  taskType: StewardshipTaskType;
  domain: MDMDomain;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
  description: string;
  assignedTo?: string;
  assignedAt?: Date;
  dueDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  completedBy?: string;
  data: TaskData;
  comments: TaskComment[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Data associated with a stewardship task
 */
export interface TaskData {
  recordIds?: string[];
  conflicts?: DataConflict[];
  matches?: MatchResult[];
  changes?: DataChange[];
  validationErrors?: ValidationError[];
  customData?: Record<string, unknown>;
}

/**
 * Comment on a stewardship task
 */
export interface TaskComment {
  commentId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: Date;
  attachments?: string[];
}

/**
 * Data change for audit trail
 */
export interface DataChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  errorCode: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  domain: MDMDomain;
  taskType: StewardshipTaskType;
  steps: WorkflowStep[];
  isActive: boolean;
  autoAssign: boolean;
  assignmentRules?: AssignmentRule[];
  escalationRules?: EscalationRule[];
  sla?: SLAConfig;
  metadata?: Record<string, unknown>;
}

/**
 * Step in a workflow
 */
export interface WorkflowStep {
  stepId: string;
  name: string;
  order: number;
  type: 'manual' | 'automatic';
  action: string;
  requiredRole?: string;
  timeout?: number; // minutes
  onTimeout?: 'escalate' | 'auto_approve' | 'auto_reject';
  conditions?: WorkflowCondition[];
}

/**
 * Condition for workflow execution
 */
export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: unknown;
}

/**
 * Rule for task assignment
 */
export interface AssignmentRule {
  ruleId: string;
  priority: number;
  conditions: WorkflowCondition[];
  assignTo: string | string[]; // User ID or role
  balanceLoad: boolean;
}

/**
 * Rule for escalation
 */
export interface EscalationRule {
  ruleId: string;
  triggerAfter: number; // minutes
  escalateTo: string | string[];
  notificationChannels?: ('email' | 'slack' | 'sms')[];
  message?: string;
}

/**
 * SLA configuration
 */
export interface SLAConfig {
  responseTime: number; // minutes
  resolutionTime: number; // minutes
  businessHoursOnly: boolean;
  excludeWeekends: boolean;
  timezone: string;
}

// ============================================================================
// Reference Data Types
// ============================================================================

/**
 * Reference data for standardization and validation
 */
export interface ReferenceData {
  referenceId: string;
  domain: MDMDomain;
  category: string;
  code: string;
  value: string;
  description?: string;
  parentCode?: string;
  attributes?: Record<string, unknown>;
  isActive: boolean;
  effectiveDate: Date;
  endDate?: Date;
  version: number;
  metadata?: Record<string, unknown>;
}

/**
 * Reference data set
 */
export interface ReferenceDataSet {
  setId: string;
  name: string;
  domain: MDMDomain;
  category: string;
  description?: string;
  data: ReferenceData[];
  version: number;
  isActive: boolean;
  updatedAt: Date;
  updatedBy: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Version Control Types
// ============================================================================

/**
 * Version of a master data record
 */
export interface DataVersion<T = Record<string, unknown>> {
  versionId: string;
  recordId: string;
  version: number;
  data: T;
  changeType: ChangeType;
  changes: DataChange[];
  createdAt: Date;
  createdBy: string;
  reason?: string;
  previousVersionId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Type of change
 */
export type ChangeType =
  | 'create'
  | 'update'
  | 'delete'
  | 'merge'
  | 'split'
  | 'restore';

/**
 * Audit log entry
 */
export interface AuditLog {
  auditId: string;
  entityType: string;
  entityId: string;
  domain: MDMDomain;
  action: string;
  changeType: ChangeType;
  userId: string;
  userName: string;
  timestamp: Date;
  ipAddress?: string;
  changes?: DataChange[];
  reason?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * MDM Engine configuration
 */
export interface MDMConfig {
  domains: MDMDomainConfig[];
  matching: MatchingConfig;
  merging: MergingConfig;
  hierarchy: HierarchyConfig;
  stewardship: StewardshipConfig;
  storage: StorageConfig;
  audit: AuditConfig;
  metadata?: Record<string, unknown>;
}

/**
 * Domain-specific configuration
 */
export interface MDMDomainConfig {
  domain: MDMDomain;
  enabled: boolean;
  matchRules: MatchRule[];
  mergeStrategy: MergeStrategy;
  workflows: WorkflowDefinition[];
  referenceDataSets?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Matching configuration
 */
export interface MatchingConfig {
  enableAutoMatching: boolean;
  autoMatchThreshold: number;
  reviewThreshold: number;
  maxCandidates: number;
  useBlocking: boolean;
  parallelProcessing: boolean;
  batchSize?: number;
}

/**
 * Merging configuration
 */
export interface MergingConfig {
  enableAutoMerge: boolean;
  autoMergeThreshold: number;
  defaultConflictResolution: ConflictResolutionStrategy;
  preserveSourceRecords: boolean;
  versionControl: boolean;
}

/**
 * Hierarchy configuration
 */
export interface HierarchyConfig {
  validation: HierarchyValidation;
  enableCaching: boolean;
  cacheTimeout?: number;
  allowDynamicHierarchies: boolean;
}

/**
 * Stewardship configuration
 */
export interface StewardshipConfig {
  enableWorkflows: boolean;
  autoAssignment: boolean;
  enableNotifications: boolean;
  notificationChannels: ('email' | 'slack' | 'sms')[];
  enableSLA: boolean;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  type: 'postgresql' | 'mongodb' | 'custom';
  connectionString?: string;
  database?: string;
  schema?: string;
  pool?: {
    min: number;
    max: number;
  };
}

/**
 * Audit configuration
 */
export interface AuditConfig {
  enabled: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed';
  retentionDays: number;
  includeDataSnapshots: boolean;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const SourceSystemSchema = z.object({
  systemId: z.string(),
  systemName: z.string(),
  systemType: z.string(),
  priority: z.number().min(0).max(100),
  lastSyncDate: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SourceRecordSchema = z.object({
  recordId: z.string(),
  sourceSystem: SourceSystemSchema,
  domain: z.string(),
  data: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  version: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export const MatchRuleSchema = z.object({
  ruleId: z.string(),
  name: z.string(),
  domain: z.string(),
  fields: z.array(z.object({
    fieldName: z.string(),
    weight: z.number().min(0).max(1),
    algorithm: z.enum(['exact', 'fuzzy', 'phonetic', 'levenshtein', 'jaro_winkler', 'ngram', 'custom']),
    caseSensitive: z.boolean().optional(),
    normalizeWhitespace: z.boolean().optional(),
    removeSpecialChars: z.boolean().optional(),
    phoneticAlgorithm: z.enum(['soundex', 'metaphone', 'double_metaphone']).optional(),
    threshold: z.number().min(0).max(1).optional(),
  })),
  algorithm: z.enum(['exact', 'fuzzy', 'phonetic', 'levenshtein', 'jaro_winkler', 'ngram', 'custom']),
  threshold: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  enabled: z.boolean(),
  priority: z.number().int(),
  metadata: z.record(z.unknown()).optional(),
});

export const StewardshipTaskSchema = z.object({
  taskId: z.string(),
  taskType: z.enum(['merge_review', 'conflict_resolution', 'data_quality_issue', 'hierarchy_validation', 'new_record_approval', 'change_approval', 'deduplication', 'enrichment']),
  domain: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'rejected', 'cancelled', 'escalated']),
  title: z.string(),
  description: z.string(),
  assignedTo: z.string().optional(),
  assignedAt: z.date().optional(),
  dueDate: z.date().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  completedBy: z.string().optional(),
  data: z.object({
    recordIds: z.array(z.string()).optional(),
    conflicts: z.array(z.any()).optional(),
    matches: z.array(z.any()).optional(),
    changes: z.array(z.any()).optional(),
    validationErrors: z.array(z.any()).optional(),
    customData: z.record(z.unknown()).optional(),
  }),
  comments: z.array(z.any()),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});
