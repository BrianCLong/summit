/**
 * Data Quality Management Types
 */

export interface QualityProfile {
  recordId: string;
  domain: string;
  overallScore: number;
  dimensionScores: DimensionScore[];
  ruleResults: RuleResult[];
  issues: QualityIssue[];
  lastAssessed: Date;
  assessedBy: string;
}

export interface DimensionScore {
  dimension: QualityDimension;
  score: number;
  weight: number;
  passedRules: number;
  totalRules: number;
  issues: QualityIssue[];
}

export type QualityDimension =
  | 'completeness'
  | 'accuracy'
  | 'consistency'
  | 'validity'
  | 'uniqueness'
  | 'timeliness'
  | 'conformity'
  | 'integrity';

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  dimension: QualityDimension;
  passed: boolean;
  score: number;
  expectedValue?: unknown;
  actualValue?: unknown;
  errorMessage?: string;
  severity: Severity;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface QualityIssue {
  id: string;
  recordId: string;
  fieldName?: string;
  issueType: IssueType;
  dimension: QualityDimension;
  severity: Severity;
  description: string;
  detectedAt: Date;
  status: IssueStatus;
  assignedTo?: string;
  resolution?: IssueResolution;
  autoFixable: boolean;
}

export type IssueType =
  | 'missing_value'
  | 'invalid_format'
  | 'out_of_range'
  | 'duplicate'
  | 'inconsistent'
  | 'stale'
  | 'non_conforming'
  | 'referential_integrity'
  | 'custom';

export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'deferred'
  | 'false_positive'
  | 'wont_fix';

export interface IssueResolution {
  resolvedBy: string;
  resolvedAt: Date;
  resolutionType: ResolutionType;
  oldValue?: unknown;
  newValue?: unknown;
  notes?: string;
}

export type ResolutionType =
  | 'corrected'
  | 'accepted'
  | 'deferred'
  | 'automated_fix'
  | 'manual_fix';

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  domain: string;
  dimension: QualityDimension;
  ruleType: QualityRuleType;
  severity: Severity;
  threshold?: number;
  expression: string;
  active: boolean;
  autoFix: boolean;
  fixLogic?: string;
  metadata: QualityRuleMetadata;
}

export type QualityRuleType =
  | 'field_validation'
  | 'record_validation'
  | 'cross_field'
  | 'cross_record'
  | 'business_rule'
  | 'statistical'
  | 'ml_based';

export interface QualityRuleMetadata {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
  executionCount: number;
  lastExecuted?: Date;
  passRate?: number;
}

export interface QualityMetrics {
  domain: string;
  period: string;
  overallScore: number;
  dimensionScores: Record<QualityDimension, number>;
  recordsAssessed: number;
  issuesFound: number;
  issuesResolved: number;
  trends: QualityTrend[];
  topIssues: QualityIssue[];
}

export interface QualityTrend {
  date: Date;
  score: number;
  issueCount: number;
  dimension?: QualityDimension;
}

export interface EnrichmentConfig {
  domain: string;
  enrichmentRules: EnrichmentRule[];
  providers: EnrichmentProvider[];
  autoEnrich: boolean;
  approvalRequired: boolean;
}

export interface EnrichmentRule {
  id: string;
  name: string;
  targetFields: string[];
  sourceFields: string[];
  provider: string;
  transformations: Transformation[];
  active: boolean;
}

export interface Transformation {
  type: TransformationType;
  config: Record<string, unknown>;
  order: number;
}

export type TransformationType =
  | 'lookup'
  | 'calculation'
  | 'concatenation'
  | 'splitting'
  | 'formatting'
  | 'normalization'
  | 'geocoding'
  | 'api_call'
  | 'custom';

export interface EnrichmentProvider {
  id: string;
  name: string;
  type: ProviderType;
  endpoint?: string;
  credentials?: Record<string, string>;
  rateLimit?: number;
  cost?: number;
  active: boolean;
}

export type ProviderType =
  | 'internal'
  | 'external_api'
  | 'database'
  | 'file'
  | 'ml_model'
  | 'custom';

export interface StandardizationRule {
  id: string;
  name: string;
  domain: string;
  fields: string[];
  standardFormat: string;
  transformations: Transformation[];
  validationPattern?: string;
  active: boolean;
}
