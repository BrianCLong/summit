/**
 * Pipeline-specific types
 */

import { EventEmitter } from 'events';
import { PipelineStatus, PipelineMetrics, PipelineContext } from './index';

// ============================================================================
// Pipeline Execution Types
// ============================================================================

export interface PipelineExecutionConfig {
  pipelineId: string;
  mode: 'sync' | 'async';
  parameters?: Record<string, any>;
  dryRun?: boolean;
  resumeFromCheckpoint?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface PipelineCheckpoint {
  executionId: string;
  timestamp: Date;
  state: Record<string, any>;
  lastProcessedRecord?: any;
  position?: number | string;
  metadata?: Record<string, any>;
}

export interface PipelineResult {
  executionId: string;
  status: PipelineStatus;
  metrics: PipelineMetrics;
  errors?: PipelineError[];
  checkpoints?: PipelineCheckpoint[];
  output?: any;
}

export interface PipelineError {
  timestamp: Date;
  stage: string;
  error: Error;
  record?: any;
  retry?: number;
  recoverable?: boolean;
}

// ============================================================================
// Stage Types
// ============================================================================

export enum StageType {
  EXTRACT = 'extract',
  TRANSFORM = 'transform',
  LOAD = 'load',
  VALIDATE = 'validate',
  ENRICH = 'enrich',
  QUALITY_CHECK = 'quality_check',
  CUSTOM = 'custom',
}

export interface StageConfig {
  id: string;
  type: StageType;
  name: string;
  description?: string;
  enabled?: boolean;
  config: Record<string, any>;
  dependencies?: string[];
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    backoff: 'linear' | 'exponential';
  };
}

export interface StageContext extends PipelineContext {
  stageId: string;
  stageName: string;
  input?: any;
  output?: any;
}

export interface StageResult {
  stageId: string;
  status: 'success' | 'failure' | 'skipped';
  duration: number;
  recordsProcessed: number;
  errors?: Error[];
  output?: any;
  metadata?: Record<string, any>;
}

// ============================================================================
// Data Flow Types
// ============================================================================

export interface DataStream {
  id: string;
  schema?: any;
  metadata?: Record<string, any>;
  [Symbol.asyncIterator](): AsyncIterator<any>;
}

export interface DataBatch {
  id: string;
  data: any[];
  schema?: any;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface StreamOptions {
  batchSize?: number;
  highWaterMark?: number;
  backpressure?: boolean;
  ordered?: boolean;
}

// ============================================================================
// Parallel Processing Types
// ============================================================================

export interface ParallelConfig {
  enabled: boolean;
  workers?: number;
  strategy: 'round-robin' | 'hash' | 'random' | 'custom';
  partitionKey?: string;
  maxQueueSize?: number;
}

export interface WorkerTask {
  id: string;
  data: any;
  retries: number;
  timestamp: Date;
}

// ============================================================================
// State Management Types
// ============================================================================

export interface StateStore {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface PipelineState {
  executionId: string;
  status: PipelineStatus;
  currentStage?: string;
  progress: number;
  checkpoints: Map<string, PipelineCheckpoint>;
  errors: PipelineError[];
  startTime: Date;
  endTime?: Date;
  metadata: Record<string, any>;
}

// ============================================================================
// Resource Management Types
// ============================================================================

export interface ResourceLimits {
  maxMemoryMB?: number;
  maxCPUPercent?: number;
  maxDiskMB?: number;
  maxNetworkMBps?: number;
  maxDurationSeconds?: number;
}

export interface ResourceUsage {
  memoryMB: number;
  cpuPercent: number;
  diskMB: number;
  networkMBps: number;
  timestamp: Date;
}

// ============================================================================
// Testing & Validation Types
// ============================================================================

export interface DryRunResult {
  valid: boolean;
  estimatedDuration?: number;
  estimatedRecords?: number;
  estimatedCost?: number;
  warnings?: string[];
  errors?: string[];
  sampleOutput?: any[];
}

export interface PipelineValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: string;
  message: string;
  field?: string;
  stage?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  recommendation?: string;
}

// ============================================================================
// Monitoring & Alerts Types
// ============================================================================

export interface AlertConfig {
  id: string;
  name: string;
  condition: string | ((metrics: PipelineMetrics) => boolean);
  severity: 'critical' | 'high' | 'medium' | 'low';
  channels: AlertChannel[];
  cooldownMinutes?: number;
  enabled: boolean;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'sns';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  configId: string;
  pipelineId: string;
  executionId: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  metrics?: PipelineMetrics;
  acknowledged?: boolean;
}

// ============================================================================
// Cost & SLA Types
// ============================================================================

export interface CostConfig {
  computeCostPerHour?: number;
  storageCostPerGB?: number;
  networkCostPerGB?: number;
  customCosts?: Record<string, number>;
}

export interface SLAConfig {
  maxDurationMinutes?: number;
  minSuccessRate?: number;
  maxErrorRate?: number;
  maxLatencySeconds?: number;
  dataFreshnessMinutes?: number;
}

export interface SLAViolation {
  type: 'duration' | 'success_rate' | 'error_rate' | 'latency' | 'freshness';
  threshold: number;
  actual: number;
  timestamp: Date;
  pipelineId: string;
  executionId: string;
}

// ============================================================================
// Versioning Types
// ============================================================================

export interface PipelineVersion {
  version: string;
  pipelineId: string;
  config: any;
  createdBy: string;
  createdAt: Date;
  changeLog?: string;
  deprecated?: boolean;
}

export interface PipelineComparison {
  version1: string;
  version2: string;
  differences: PipelineDifference[];
  compatibilityScore: number;
  breaking: boolean;
}

export interface PipelineDifference {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
  breaking?: boolean;
}
