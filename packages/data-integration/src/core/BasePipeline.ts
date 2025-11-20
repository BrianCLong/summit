/**
 * Base pipeline implementation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { IPipeline } from '../interfaces/IPipeline';
import {
  IntegrationConfig,
  PipelineStatus,
  PipelineMetrics,
  PipelineContext,
} from '../types';
import {
  PipelineExecutionConfig,
  PipelineResult,
  PipelineCheckpoint,
  PipelineValidationResult,
  DryRunResult,
  PipelineState,
  PipelineError,
} from '../types/pipeline.types';

/**
 * Abstract base pipeline class
 */
export abstract class BasePipeline extends EventEmitter implements IPipeline {
  protected config: IntegrationConfig;
  protected executions: Map<string, PipelineState> = new Map();
  protected checkpoints: Map<string, PipelineCheckpoint> = new Map();

  constructor(config: IntegrationConfig) {
    super();
    this.config = config;
  }

  /**
   * Get pipeline ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get pipeline configuration
   */
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  /**
   * Update pipeline configuration
   */
  async updateConfig(config: Partial<IntegrationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }

  /**
   * Validate pipeline configuration
   */
  async validate(): Promise<PipelineValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation
    if (!this.config.source) {
      errors.push({ type: 'config', message: 'Source configuration is required' });
    }

    if (!this.config.target) {
      errors.push({ type: 'config', message: 'Target configuration is required' });
    }

    // Custom validation
    const customValidation = await this.customValidate();
    errors.push(...customValidation.errors);
    warnings.push(...customValidation.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Execute pipeline
   */
  async execute(config?: PipelineExecutionConfig): Promise<PipelineResult> {
    const executionId = uuidv4();
    const context = this.createContext(executionId, config);

    // Initialize state
    const state: PipelineState = {
      executionId,
      status: PipelineStatus.RUNNING,
      progress: 0,
      checkpoints: new Map(),
      errors: [],
      startTime: new Date(),
      metadata: {},
    };

    this.executions.set(executionId, state);
    this.emit('execution:started', { executionId, context });

    try {
      // Validate before execution
      const validation = await this.validate();
      if (!validation.valid) {
        throw new Error(`Pipeline validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Execute pipeline stages
      await this.executeInternal(context);

      // Complete execution
      state.status = PipelineStatus.COMPLETED;
      state.endTime = new Date();
      this.emit('execution:completed', { executionId });

      return this.createResult(executionId, state);
    } catch (error) {
      state.status = PipelineStatus.FAILED;
      state.endTime = new Date();
      state.errors.push({
        timestamp: new Date(),
        stage: 'execution',
        error: error as Error,
        recoverable: false,
      });

      this.emit('execution:failed', { executionId, error });
      return this.createResult(executionId, state);
    }
  }

  /**
   * Cancel execution
   */
  async cancel(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }

    state.status = PipelineStatus.CANCELLED;
    state.endTime = new Date();
    this.emit('execution:cancelled', { executionId });
  }

  /**
   * Pause execution
   */
  async pause(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (state.status !== PipelineStatus.RUNNING) {
      throw new Error(`Cannot pause execution in status: ${state.status}`);
    }

    state.status = PipelineStatus.PAUSED;
    this.emit('execution:paused', { executionId });
  }

  /**
   * Resume execution
   */
  async resume(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (state.status !== PipelineStatus.PAUSED) {
      throw new Error(`Cannot resume execution in status: ${state.status}`);
    }

    state.status = PipelineStatus.RUNNING;
    this.emit('execution:resumed', { executionId });
  }

  /**
   * Get execution status
   */
  async getStatus(executionId: string): Promise<PipelineStatus> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }
    return state.status;
  }

  /**
   * Get execution metrics
   */
  async getMetrics(executionId: string): Promise<PipelineMetrics> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }

    return {
      pipelineId: this.config.id,
      executionId,
      status: state.status,
      startTime: state.startTime,
      endTime: state.endTime,
      duration: state.endTime ? state.endTime.getTime() - state.startTime.getTime() : undefined,
      recordsProcessed: state.metadata.recordsProcessed || 0,
      recordsSucceeded: state.metadata.recordsSucceeded || 0,
      recordsFailed: state.metadata.recordsFailed || 0,
      recordsSkipped: state.metadata.recordsSkipped || 0,
      bytesProcessed: state.metadata.bytesProcessed || 0,
    };
  }

  /**
   * Perform dry run
   */
  async dryRun(config?: PipelineExecutionConfig): Promise<DryRunResult> {
    const validation = await this.validate();

    return {
      valid: validation.valid,
      warnings: validation.warnings.map(w => w.message),
      errors: validation.errors.map(e => e.message),
    };
  }

  /**
   * Create checkpoint
   */
  async createCheckpoint(executionId: string): Promise<PipelineCheckpoint> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const checkpoint: PipelineCheckpoint = {
      executionId,
      timestamp: new Date(),
      state: { ...state.metadata },
    };

    const checkpointId = uuidv4();
    this.checkpoints.set(checkpointId, checkpoint);
    state.checkpoints.set(checkpointId, checkpoint);

    this.emit('checkpoint:created', { executionId, checkpointId });
    return checkpoint;
  }

  /**
   * Resume from checkpoint
   */
  async resumeFromCheckpoint(checkpointId: string): Promise<PipelineResult> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // Create new execution with checkpoint state
    return this.execute({
      pipelineId: this.config.id,
      mode: 'async',
      resumeFromCheckpoint: checkpointId,
    });
  }

  // ============================================================================
  // Protected helper methods
  // ============================================================================

  /**
   * Create execution context
   */
  protected createContext(executionId: string, config?: PipelineExecutionConfig): PipelineContext {
    return {
      pipelineId: this.config.id,
      executionId,
      startTime: new Date(),
      parameters: config?.parameters || {},
      state: {},
      metrics: {},
    };
  }

  /**
   * Create pipeline result
   */
  protected createResult(executionId: string, state: PipelineState): PipelineResult {
    const metrics: PipelineMetrics = {
      pipelineId: this.config.id,
      executionId,
      status: state.status,
      startTime: state.startTime,
      endTime: state.endTime,
      duration: state.endTime ? state.endTime.getTime() - state.startTime.getTime() : undefined,
      recordsProcessed: state.metadata.recordsProcessed || 0,
      recordsSucceeded: state.metadata.recordsSucceeded || 0,
      recordsFailed: state.metadata.recordsFailed || 0,
      recordsSkipped: state.metadata.recordsSkipped || 0,
      bytesProcessed: state.metadata.bytesProcessed || 0,
    };

    return {
      executionId,
      status: state.status,
      metrics,
      errors: state.errors,
      checkpoints: Array.from(state.checkpoints.values()),
    };
  }

  // ============================================================================
  // Abstract methods to be implemented by subclasses
  // ============================================================================

  /**
   * Execute pipeline internal logic
   */
  protected abstract executeInternal(context: PipelineContext): Promise<void>;

  /**
   * Custom validation hook
   */
  protected abstract customValidate(): Promise<PipelineValidationResult>;
}
