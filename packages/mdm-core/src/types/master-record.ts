/**
 * Master Record (Golden Record) Types
 */

export interface MasterRecordId {
  id: string;
  domain: string;
  version: number;
}

export interface SourceRecord {
  sourceId: string;
  sourceSystem: string;
  sourceRecordId: string;
  data: Record<string, unknown>;
  lastModified: Date;
  confidence: number;
  priority: number;
}

export interface CrossReference {
  sourceSystem: string;
  sourceRecordId: string;
  masterRecordId: string;
  linkType: 'exact' | 'fuzzy' | 'manual' | 'derived';
  confidence: number;
  createdAt: Date;
  createdBy: string;
  validFrom?: Date;
  validTo?: Date;
}

export interface SurvivorshipRule {
  attributeName: string;
  strategy: SurvivorshipStrategy;
  priority: number;
  customLogic?: (sources: SourceRecord[]) => unknown;
}

export type SurvivorshipStrategy =
  | 'most_recent'
  | 'most_complete'
  | 'most_trusted_source'
  | 'most_frequent'
  | 'highest_quality_score'
  | 'longest_value'
  | 'custom';

export interface MasterRecord {
  id: MasterRecordId;
  domain: string;
  data: Record<string, unknown>;
  sourceRecords: SourceRecord[];
  crossReferences: CrossReference[];
  qualityScore: number;
  certificationStatus: CertificationStatus;
  steward?: string;
  lineage: RecordLineage;
  metadata: MasterRecordMetadata;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type CertificationStatus =
  | 'draft'
  | 'pending_review'
  | 'certified'
  | 'deprecated'
  | 'archived';

export interface RecordLineage {
  sourceOperations: LineageOperation[];
  transformations: TransformationStep[];
  matchingHistory: MatchingEvent[];
  mergeHistory: MergeEvent[];
}

export interface LineageOperation {
  operationId: string;
  operationType: 'create' | 'update' | 'merge' | 'split' | 'delete';
  timestamp: Date;
  user: string;
  sourceSystem?: string;
  changes: FieldChange[];
}

export interface FieldChange {
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  confidence: number;
}

export interface TransformationStep {
  stepId: string;
  transformationType: string;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  timestamp: Date;
  ruleName?: string;
}

export interface MatchingEvent {
  eventId: string;
  matchedRecords: string[];
  matchScore: number;
  matchAlgorithm: string;
  timestamp: Date;
  autoApproved: boolean;
}

export interface MergeEvent {
  eventId: string;
  sourceRecords: string[];
  targetRecord: string;
  survivorshipRules: SurvivorshipRule[];
  conflicts: ConflictResolution[];
  timestamp: Date;
  mergedBy: string;
}

export interface ConflictResolution {
  fieldName: string;
  conflictingValues: Array<{
    value: unknown;
    source: string;
    confidence: number;
  }>;
  resolvedValue: unknown;
  resolutionStrategy: string;
  resolvedBy: string;
  timestamp: Date;
}

export interface MasterRecordMetadata {
  tags: string[];
  classifications: string[];
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPolicy?: string;
  dataOwner?: string;
  lastCertifiedAt?: Date;
  lastCertifiedBy?: string;
  customAttributes: Record<string, unknown>;
}
