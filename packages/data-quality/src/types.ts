/**
 * Core types for data quality management
 */

export interface DataProfile {
  id: string;
  datasetId: string;
  columnName: string;
  dataType: string;
  totalRows: number;
  nullCount: number;
  uniqueCount: number;
  duplicateCount: number;
  completeness: number;
  uniqueness: number;
  validity: number;
  statistics: DataStatistics;
  patterns: PatternAnalysis[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DataStatistics {
  min?: number | string | Date;
  max?: number | string | Date;
  mean?: number;
  median?: number;
  mode?: any;
  standardDeviation?: number;
  variance?: number;
  skewness?: number;
  kurtosis?: number;
  percentiles: Record<number, number>;
  distribution: DistributionAnalysis;
}

export interface DistributionAnalysis {
  type: 'normal' | 'uniform' | 'exponential' | 'skewed' | 'bimodal' | 'unknown';
  confidence: number;
  histogram: HistogramBin[];
}

export interface HistogramBin {
  range: [number, number];
  count: number;
  frequency: number;
}

export interface PatternAnalysis {
  pattern: string;
  regex?: string;
  count: number;
  percentage: number;
  examples: any[];
}

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  scope: 'column' | 'row' | 'dataset' | 'cross-dataset';
  condition: RuleCondition;
  threshold?: number;
  actions: RuleAction[];
  enabled: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RuleType =
  | 'completeness'
  | 'uniqueness'
  | 'validity'
  | 'consistency'
  | 'accuracy'
  | 'timeliness'
  | 'referential-integrity'
  | 'format'
  | 'range'
  | 'pattern'
  | 'custom';

export interface RuleCondition {
  operator: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'between' | 'in' | 'not-in' | 'matches' | 'custom';
  value: any;
  customFunction?: string;
}

export interface RuleAction {
  type: 'alert' | 'reject' | 'quarantine' | 'transform' | 'log' | 'notify';
  config: Record<string, any>;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: string;
  message: string;
  affectedRows: number;
  affectedColumns: string[];
  violations: Violation[];
  timestamp: Date;
}

export interface Violation {
  rowId?: string;
  columnName: string;
  currentValue: any;
  expectedValue?: any;
  message: string;
}

export interface QualityScore {
  datasetId: string;
  overallScore: number;
  dimensions: QualityDimensions;
  trendAnalysis: TrendAnalysis;
  recommendations: Recommendation[];
  timestamp: Date;
}

export interface QualityDimensions {
  completeness: number;
  uniqueness: number;
  validity: number;
  consistency: number;
  accuracy: number;
  timeliness: number;
}

export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'declining';
  changeRate: number;
  historicalScores: HistoricalScore[];
}

export interface HistoricalScore {
  timestamp: Date;
  score: number;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  suggestion: string;
  estimatedImpact: number;
}

export interface DataAnomaly {
  id: string;
  datasetId: string;
  type: AnomalyType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  detectedAt: Date;
  affectedData: AffectedData;
  confidence: number;
  rootCause?: string;
  suggestedAction?: string;
}

export type AnomalyType =
  | 'volume-spike'
  | 'volume-drop'
  | 'schema-drift'
  | 'pattern-deviation'
  | 'statistical-outlier'
  | 'data-freshness'
  | 'quality-degradation'
  | 'referential-integrity-violation';

export interface AffectedData {
  tableName?: string;
  columnNames?: string[];
  rowCount?: number;
  timeRange?: [Date, Date];
}

export interface RemediationPlan {
  id: string;
  anomalyId?: string;
  validationResultId?: string;
  strategy: RemediationStrategy;
  steps: RemediationStep[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  automatable: boolean;
  estimatedDuration?: number;
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
}

export type RemediationStrategy =
  | 'cleanse'
  | 'standardize'
  | 'enrich'
  | 'deduplicate'
  | 'impute'
  | 'transform'
  | 'quarantine'
  | 'reject';

export interface RemediationStep {
  order: number;
  action: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
}

export interface ProfilingConfig {
  sampleSize?: number;
  includePatterns?: boolean;
  includeDistribution?: boolean;
  includeStatistics?: boolean;
  customMetrics?: string[];
}

export interface ValidationConfig {
  stopOnFirstError?: boolean;
  maxViolations?: number;
  parallelValidation?: boolean;
  customValidators?: Record<string, Function>;
}
