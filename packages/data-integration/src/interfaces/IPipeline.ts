/**
 * Core pipeline interfaces
 */

import { EventEmitter } from 'events';
import {
  IntegrationConfig,
  PipelineStatus,
  PipelineMetrics,
  PipelineContext,
  PipelineMode,
  WorkflowDefinition,
} from '../types';
import {
  PipelineExecutionConfig,
  PipelineResult,
  PipelineCheckpoint,
  StageConfig,
  StageResult,
  DryRunResult,
  PipelineValidationResult,
} from '../types/pipeline.types';

/**
 * Core pipeline interface
 */
export interface IPipeline extends EventEmitter {
  /**
   * Get pipeline ID
   */
  getId(): string;

  /**
   * Get pipeline configuration
   */
  getConfig(): IntegrationConfig;

  /**
   * Update pipeline configuration
   */
  updateConfig(config: Partial<IntegrationConfig>): Promise<void>;

  /**
   * Validate pipeline configuration
   */
  validate(): Promise<PipelineValidationResult>;

  /**
   * Execute pipeline
   */
  execute(config?: PipelineExecutionConfig): Promise<PipelineResult>;

  /**
   * Cancel execution
   */
  cancel(executionId: string): Promise<void>;

  /**
   * Pause execution
   */
  pause(executionId: string): Promise<void>;

  /**
   * Resume execution
   */
  resume(executionId: string): Promise<void>;

  /**
   * Get execution status
   */
  getStatus(executionId: string): Promise<PipelineStatus>;

  /**
   * Get execution metrics
   */
  getMetrics(executionId: string): Promise<PipelineMetrics>;

  /**
   * Perform dry run
   */
  dryRun(config?: PipelineExecutionConfig): Promise<DryRunResult>;

  /**
   * Create checkpoint
   */
  createCheckpoint(executionId: string): Promise<PipelineCheckpoint>;

  /**
   * Resume from checkpoint
   */
  resumeFromCheckpoint(checkpointId: string): Promise<PipelineResult>;
}

/**
 * ETL Pipeline interface
 */
export interface IETLPipeline extends IPipeline {
  /**
   * Extract data from source
   */
  extract(context: PipelineContext): AsyncIterableIterator<any>;

  /**
   * Transform data
   */
  transform(data: AsyncIterableIterator<any>, context: PipelineContext): AsyncIterableIterator<any>;

  /**
   * Load data to target
   */
  load(data: AsyncIterableIterator<any>, context: PipelineContext): Promise<void>;
}

/**
 * ELT Pipeline interface
 */
export interface IELTPipeline extends IPipeline {
  /**
   * Extract and load data (minimal transformation)
   */
  extractAndLoad(context: PipelineContext): Promise<void>;

  /**
   * Transform data in target system
   */
  transformInPlace(context: PipelineContext): Promise<void>;
}

/**
 * Streaming Pipeline interface
 */
export interface IStreamingPipeline extends IPipeline {
  /**
   * Start streaming
   */
  startStreaming(config?: PipelineExecutionConfig): Promise<string>;

  /**
   * Stop streaming
   */
  stopStreaming(streamId: string): Promise<void>;

  /**
   * Get stream status
   */
  getStreamStatus(streamId: string): Promise<StreamStatus>;

  /**
   * Configure backpressure
   */
  configureBackpressure(config: BackpressureConfig): Promise<void>;
}

/**
 * Pipeline builder interface for fluent API
 */
export interface IPipelineBuilder {
  /**
   * Set pipeline name
   */
  name(name: string): IPipelineBuilder;

  /**
   * Set pipeline description
   */
  description(description: string): IPipelineBuilder;

  /**
   * Set pipeline mode
   */
  mode(mode: PipelineMode): IPipelineBuilder;

  /**
   * Configure source
   */
  source(config: any): IPipelineBuilder;

  /**
   * Configure target
   */
  target(config: any): IPipelineBuilder;

  /**
   * Add transformation
   */
  transform(config: any): IPipelineBuilder;

  /**
   * Add validation
   */
  validate(config: any): IPipelineBuilder;

  /**
   * Configure error handling
   */
  errorHandling(config: any): IPipelineBuilder;

  /**
   * Configure performance
   */
  performance(config: any): IPipelineBuilder;

  /**
   * Configure schedule
   */
  schedule(config: any): IPipelineBuilder;

  /**
   * Build pipeline
   */
  build(): IPipeline;
}

/**
 * Pipeline stage interface
 */
export interface IPipelineStage {
  /**
   * Get stage ID
   */
  getId(): string;

  /**
   * Get stage configuration
   */
  getConfig(): StageConfig;

  /**
   * Execute stage
   */
  execute(input: any, context: PipelineContext): Promise<StageResult>;

  /**
   * Validate stage
   */
  validate(): Promise<boolean>;

  /**
   * Get dependencies
   */
  getDependencies(): string[];
}

/**
 * Transformation interface
 */
export interface ITransformer {
  /**
   * Get transformer name
   */
  getName(): string;

  /**
   * Transform single record
   */
  transform(record: any, context?: any): Promise<any>;

  /**
   * Transform batch of records
   */
  transformBatch(records: any[], context?: any): Promise<any[]>;

  /**
   * Validate transformation configuration
   */
  validate(config: any): Promise<boolean>;
}

/**
 * Validator interface
 */
export interface IValidator {
  /**
   * Validate single record
   */
  validate(record: any): Promise<ValidationResult>;

  /**
   * Validate batch of records
   */
  validateBatch(records: any[]): Promise<BatchValidationResult>;

  /**
   * Get validation rules
   */
  getRules(): any[];
}

/**
 * Workflow orchestrator interface
 */
export interface IWorkflowOrchestrator {
  /**
   * Create workflow
   */
  createWorkflow(definition: WorkflowDefinition): Promise<string>;

  /**
   * Update workflow
   */
  updateWorkflow(id: string, definition: Partial<WorkflowDefinition>): Promise<void>;

  /**
   * Delete workflow
   */
  deleteWorkflow(id: string): Promise<void>;

  /**
   * Execute workflow
   */
  executeWorkflow(id: string, parameters?: Record<string, any>): Promise<string>;

  /**
   * Cancel workflow execution
   */
  cancelExecution(executionId: string): Promise<void>;

  /**
   * Get workflow status
   */
  getWorkflowStatus(executionId: string): Promise<WorkflowStatus>;

  /**
   * Get workflow history
   */
  getWorkflowHistory(id: string, limit?: number): Promise<WorkflowExecution[]>;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface StreamStatus {
  streamId: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  recordsProcessed: number;
  startTime: Date;
  lastProcessedTime?: Date;
  throughput?: number;
  errors?: Error[];
}

export interface BackpressureConfig {
  enabled: boolean;
  highWaterMark?: number;
  lowWaterMark?: number;
  strategy?: 'drop' | 'buffer' | 'block';
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface BatchValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  results: ValidationResult[];
}

export interface WorkflowStatus {
  executionId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentNode?: string;
  startTime: Date;
  endTime?: Date;
  progress: number;
  errors?: Error[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus['status'];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  parameters?: Record<string, any>;
  result?: any;
  error?: Error;
}
