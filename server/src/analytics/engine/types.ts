/**
 * Predictive Execution Engine Types
 *
 * Type definitions for the governed predictive analytics engine.
 * All types conform to the Predictive Model Contract.
 *
 * @module analytics/engine/types
 */

import type { GovernanceVerdict } from '../../governance/types.ts';

// ============================================================================
// Prediction Types (from Contract Section 1)
// ============================================================================

export type PredictionType =
  | 'trend_analysis'
  | 'risk_assessment'
  | 'likelihood_scoring'
  | 'anomaly_detection'
  | 'what_if_simulation';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type ConfidenceBand = 'very_high' | 'high' | 'medium' | 'low';

// ============================================================================
// Data Source Types (from Contract Section 2)
// ============================================================================

export type DataSourceType =
  | 'knowledge_graph'
  | 'audit_events'
  | 'telemetry_aggregates'
  | 'policy_state'
  | 'agent_execution_logs'
  | 'compliance_evidence';

export interface DataSource {
  type: DataSourceType;
  query: string;
  timestamp: string;
  recordCount: number;
}

export interface DataFreshness {
  oldestRecord: string; // ISO 8601
  youngestRecord: string; // ISO 8601
  stalenessTolerance: string; // ISO 8601 duration
}

// ============================================================================
// Output Schemas (from Contract Section 3)
// ============================================================================

export interface PredictionScore {
  predictionId: string;
  type: PredictionType;
  value: number;
  confidence: number; // 0-1
  range?: { min: number; max: number };
  unit: string;
  timestamp: string;
}

export interface RankedHypothesis {
  predictionId: string;
  hypotheses: Array<{
    rank: number;
    scenario: string;
    likelihood: number; // 0-1
    impact: RiskLevel;
    supportingEvidence: string[];
  }>;
  timestamp: string;
}

export interface TrendForecast {
  predictionId: string;
  metric: string;
  baseline: number;
  forecast: Array<{
    timestamp: string;
    value: number;
    confidenceInterval: { lower: number; upper: number };
  }>;
  assumptions: string[];
}

export type PredictionOutput = PredictionScore | RankedHypothesis | TrendForecast;

// ============================================================================
// Metadata Envelope (from Contract Section 5)
// ============================================================================

export interface ResourceUsage {
  cpuMs: number;
  memoryMb: number;
  tokenCount?: number;
}

export interface Explanation {
  method: string;
  featureImportance?: Record<string, number>;
  topFactors: string[];
}

export interface PredictionMetadata {
  // Identification
  predictionId: string;
  predictionType: PredictionType;
  modelVersion: string;

  // Governance
  governanceVerdict: GovernanceVerdict;
  capabilityAuthorization: string;
  tenantId: string;

  // Confidence & Quality
  confidence: number;
  assumptions: string[];
  limitations: string[];

  // Data Provenance
  dataSources: DataSource[];
  dataFreshness: DataFreshness;

  // Execution
  executionTime: number;
  resourceUsage: ResourceUsage;

  // Explainability
  explanation: Explanation;

  // Audit
  timestamp: string;
  auditLogId?: string;
}

// ============================================================================
// Prediction Request & Response
// ============================================================================

export interface PredictionRequest {
  type: PredictionType;
  tenantId: string;
  agentId?: string;
  inputs: Record<string, any>;
  options?: PredictionOptions;
}

export interface PredictionOptions {
  // Resource limits
  maxExecutionTimeMs?: number; // Default: 30000, Max: 300000
  maxMemoryMb?: number; // Default: 512, Max: 2048
  maxTokens?: number; // Default: 10000 (for LLM-based)
  maxDataRows?: number; // Default: 100000, Max: 1000000

  // Data freshness
  stalenessTolerance?: string; // ISO 8601 duration

  // Execution options
  enableCaching?: boolean; // Default: true
  deterministicSeed?: number; // For reproducibility
}

export interface PredictionResponse {
  output: PredictionOutput;
  metadata: PredictionMetadata;
}

// ============================================================================
// Execution Context & State
// ============================================================================

export interface ExecutionContext {
  predictionId: string;
  startTime: number;
  limits: ExecutionLimits;
  resourceUsage: ResourceUsage;
  abortController: AbortController;
}

export interface ExecutionLimits {
  maxExecutionTimeMs: number;
  maxMemoryMb: number;
  maxTokens: number;
  maxDataRows: number;
}

// ============================================================================
// Model Registry
// ============================================================================

export interface ValidationReport {
  validatedAt: string;
  validationDataset: string;
  accuracyMetrics: Record<string, number>;
  testsPassed: number;
  testsFailed: number;
  notes?: string;
}

export interface PredictionModel {
  modelId: string;
  version: string;
  type: PredictionType;
  accuracy: { metric: string; value: number };
  deployedAt: string;
  validatedAt: string;
  validationResults: ValidationReport;
  executor: (request: PredictionRequest, context: ExecutionContext) => Promise<PredictionOutput>;
}

// ============================================================================
// Error Types
// ============================================================================

export class PredictionError extends Error {
  constructor(
    message: string,
    public code: PredictionErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PredictionError';
  }
}

export type PredictionErrorCode =
  | 'CAPABILITY_UNAUTHORIZED'
  | 'POLICY_DENIED'
  | 'BUDGET_EXCEEDED'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'INVALID_OUTPUT'
  | 'MODEL_NOT_FOUND'
  | 'DATA_SOURCE_UNAVAILABLE'
  | 'METADATA_INCOMPLETE'
  | 'CONTRACT_VIOLATION';

// ============================================================================
// Capability Types
// ============================================================================

export interface PredictiveCapability {
  id: string;
  name: string;
  predictionTypes: PredictionType[];
  requiredDataSources: DataSourceType[];
  defaultLimits: ExecutionLimits;
}

// ============================================================================
// Audit Event Schema
// ============================================================================

export interface PredictionAuditEvent {
  eventType: 'prediction_executed' | 'prediction_failed' | 'prediction_contract_violation';
  predictionId: string;
  predictionType: PredictionType;
  tenantId: string;
  agentId?: string;
  confidence?: number;
  dataSources?: string[];
  governanceVerdict: string; // "ALLOW" | "DENY" | "ESCALATE" | "WARN"
  errorCode?: PredictionErrorCode;
  errorMessage?: string;
  timestamp: string;
}

// ============================================================================
// Confidence Calculation
// ============================================================================

export interface ConfidenceFactors {
  dataQuality: number; // 0-1
  dataFreshness: number; // 0-1
  modelAccuracy: number; // 0-1
  inputCompleteness: number; // 0-1
  assumptionValidity?: number; // 0-1
}

export function calculateConfidence(factors: ConfidenceFactors): number {
  const weights = {
    dataQuality: 0.3,
    dataFreshness: 0.2,
    modelAccuracy: 0.3,
    inputCompleteness: 0.15,
    assumptionValidity: 0.05,
  };

  let totalConfidence =
    factors.dataQuality * weights.dataQuality +
    factors.dataFreshness * weights.dataFreshness +
    factors.modelAccuracy * weights.modelAccuracy +
    factors.inputCompleteness * weights.inputCompleteness;

  if (factors.assumptionValidity !== undefined) {
    totalConfidence += factors.assumptionValidity * weights.assumptionValidity;
  }

  return Math.max(0, Math.min(1, totalConfidence));
}

export function getConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.9) return 'very_high';
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

// ============================================================================
// Confidence Decay
// ============================================================================

export function applyConfidenceDecay(
  originalConfidence: number,
  predictionTimestamp: string
): number {
  const predictionTime = new Date(predictionTimestamp).getTime();
  const now = Date.now();
  const ageMs = now - predictionTime;

  const day = 24 * 60 * 60 * 1000;
  const ageDays = ageMs / day;

  let decayFactor = 1.0;
  if (ageDays > 30) {
    decayFactor = 0.5;
  } else if (ageDays > 7) {
    decayFactor = 0.8;
  } else if (ageDays > 1) {
    decayFactor = 0.95;
  }

  return originalConfidence * decayFactor;
}
