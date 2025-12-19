/**
 * ETL Assistant Types
 */

// Canonical entity types
export type CanonicalEntityType =
  | 'Person'
  | 'Organization'
  | 'Location'
  | 'Event'
  | 'Document'
  | 'Indicator';

// Field types detected during schema inference
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'array'
  | 'object'
  | 'unknown';

// PII risk levels
export type PIIRiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

// Redaction strategies
export type RedactionStrategy = 'MASK' | 'DROP' | 'HASH';

/**
 * Field mapping from source to target
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  sourceType: FieldType;
  targetType: FieldType;
  confidence: number;
  transformation?: string;
  required: boolean;
}

/**
 * Field statistics
 */
export interface FieldStatistics {
  field: string;
  type: FieldType;
  nullCount: number;
  uniqueCount: number;
  sampleValues: unknown[];
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  min?: number;
  max?: number;
  avg?: number;
}

/**
 * Sample statistics
 */
export interface SampleStatistics {
  recordCount: number;
  fieldCount: number;
  fields: FieldStatistics[];
}

/**
 * Schema inference result
 */
export interface SchemaInferenceResult {
  entityType: CanonicalEntityType;
  confidence: number;
  fieldMappings: FieldMapping[];
  statistics: SampleStatistics;
  reasoning: string;
}

/**
 * PII field detection result
 */
export interface PIIField {
  field: string;
  piiType: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'dob' | 'name' | 'other';
  confidence: number;
  detectionMethod: 'pattern' | 'heuristic' | 'combined';
  sampleMatches: string[];
  recommendedStrategy: RedactionStrategy;
}

/**
 * Redaction recommendation
 */
export interface RedactionRecommendation {
  field: string;
  strategy: RedactionStrategy;
  reason: string;
}

/**
 * PII detection result
 */
export interface PIIDetectionResult {
  piiFields: PIIField[];
  riskLevel: PIIRiskLevel;
  recommendations: RedactionRecommendation[];
  summary: string;
}

/**
 * Canonical entity mapping
 */
export interface CanonicalEntity {
  type: CanonicalEntityType;
  externalId: string;
  props: Record<string, unknown>;
  confidence: number;
  sourceMeta: {
    connectorId: string;
    sourceId: string;
    licenseId?: string;
    ingestedAt: string;
    piiRedacted: boolean;
  };
}

/**
 * Sample record for analysis
 */
export interface SampleRecord {
  [key: string]: unknown;
}
