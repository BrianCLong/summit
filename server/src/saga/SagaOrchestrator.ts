/**
 * Saga Orchestrator
 *
 * Orchestrates distributed transactions using the saga pattern.
 * Manages step execution, compensation, and state persistence.
 *
 * SOC 2 Controls: CC5.2 (Process Integrity), CC7.1 (System Operations)
 *
 * @module saga/SagaOrchestrator
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  SagaStep,
  StepState,
  StepContext,
  StepResult,
} from './SagaStep.js';
import { SagaRepository, SagaInstance } from './SagaRepository.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type SagaStatus = 'pending' | 'running' | 'completed' | 'compensating' | 'compensated' | 'failed';

export interface SagaConfig {
  /** Saga type name */
  type: string;
  /** Saga description */
  description: string;
  /** Maximum execution time in ms */
  maxExecutionTimeMs: number;
  /** Whether to persist saga state */
  persistState: boolean;
  /** Enable compensation on failure */
  compensateOnFailure: boolean;
}

export interface SagaState<TPayload = unknown> {
  sagaId: string;
  type: string;
  tenantId: string;
  status: SagaStatus;
  payload: TPayload;
  currentStep: number;
  steps: StepState[];
  results: Map<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  error?: string;
}

export interface SagaResult<TResult = unknown> {
  success: boolean;
  sagaId: string;
  status: SagaStatus;
  result?: TResult;
  error?: string;
  steps: StepState[];
  duration: number;
}

export interface SagaEvents {
  'saga:started': { sagaId: string; type: string; tenantId: string };
  'saga:step:started': { sagaId: string; stepName: string; stepIndex: number };
  'saga:step:completed': { sagaId: string; stepName: string; stepIndex: number; result: unknown };
  'saga:step:failed': { sagaId: string; stepName: string; stepIndex: number; error: string };
  'saga:compensating': { sagaId: string; fromStep: number };
  'saga:step:compensated': { sagaId: string; stepName: string; stepIndex: number };
  'saga:completed': { sagaId: string; result: unknown; duration: number };
  'saga:failed': { sagaId: string; error: string; duration: number };
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'saga-orchestrator-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'SagaOrchestrator',
  };
}

// ============================================================================
// Saga Orchestrator Implementation
// ============================================================================

export class SagaOrchestrator<TPayload = unknown, TResult = unknown> extends EventEmitter {
  private config: SagaConfig;
  private steps: SagaStep<TPayload, unknown>[] = [];
  private repository: SagaRepository | null = null;

  constructor(config: Partial<SagaConfig> & Pick<SagaConfig, 'type'>) {
    super();
    this.config = {
      type: config.type,
      description: config.description || config.type,
      maxExecutionTimeMs: config.maxExecutionTimeMs || 300000, // 5 minutes default
      persistState: config.persistState ?? true,
      compensateOnFailure: config.compensateOnFailure ?? true,
    };
  }

  /**
   * Set the repository for state persistence
   */
  setRepository(repository: SagaRepository): this {
    this.repository = repository;
    return this;
  }

  /**
   * Add a step to the saga
   */
  addStep(step: SagaStep<TPayload, unknown>): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Execute the saga
   */
  async execute(
    tenantId: string,
    payload: TPayload,
    actorId?: string
  ): Promise<DataEnvelope<SagaResult<TResult>>> {
    const sagaId = uuidv4();
    const startTime = Date.now();

    const state: SagaState<TPayload> = {
      sagaId,
      type: this.config.type,
      tenantId,
      status: 'running',
      payload,
      currentStep: 0,
      steps: this.steps.map(s => s.getState()),
      results: new Map(),
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    // Persist initial state
    if (this.config.persistState && this.repository) {
      await this.repository.create({
        id: sagaId,
        sagaType: this.config.type,
        currentStep: 0,
        status: 'running',
        payload: payload as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        tenantId,
      });
    }

    this.emit('saga:started', { sagaId, type: this.config.type, tenantId });

    logger.info(
      {
        sagaId,
        type: this.config.type,
        tenantId,
        steps: this.steps.length,
        actorId,
      },
      'Saga started'
    );

    try {
      // Execute steps in sequence
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        state.currentStep = i;

        this.emit('saga:step:started', { sagaId, stepName: step.getName(), stepIndex: i });

        // Update persistence
        if (this.config.persistState && this.repository) {
          await this.repository.updateStep(sagaId, i);
        }

        // Create step context
        const context: StepContext<TPayload> = {
          sagaId,
          stepId: '',
          tenantId,
          payload,
          previousResults: state.results,
          metadata: {},
        };

        // Execute step
        const stepResult = await step.execute(context);

        if (!stepResult.data.success) {
          throw new Error(stepResult.data.error || `Step ${step.getName()} failed`);
        }

        // Store result
        state.results.set(step.getName(), stepResult.data.result);
        state.steps[i] = step.getState();

        this.emit('saga:step:completed', {
          sagaId,
          stepName: step.getName(),
          stepIndex: i,
          result: stepResult.data.result,
        });

        // Check for timeout
        if (Date.now() - startTime > this.config.maxExecutionTimeMs) {
          throw new Error(`Saga exceeded maximum execution time of ${this.config.maxExecutionTimeMs}ms`);
        }
      }

      // All steps completed
      state.status = 'completed';
      state.completedAt = new Date().toISOString();

      // Update persistence
      if (this.config.persistState && this.repository) {
        await this.repository.updateStatus(sagaId, 'completed');
      }

      const duration = Date.now() - startTime;

      // Get final result (from last step or aggregated)
      const finalResult = state.results.get(this.steps[this.steps.length - 1].getName()) as TResult;

      this.emit('saga:completed', { sagaId, result: finalResult, duration });

      logger.info(
        {
          sagaId,
          type: this.config.type,
          tenantId,
          duration,
        },
        'Saga completed successfully'
      );

      return createDataEnvelope(
        {
          success: true,
          sagaId,
          status: 'completed',
          result: finalResult,
          steps: state.steps,
          duration,
        },
        {
          source: 'SagaOrchestrator',
          actor: actorId,
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Saga completed successfully'),
          classification: DataClassification.INTERNAL,
        }
      );
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      state.status = 'failed';
      state.error = errorMessage;

      logger.error(
        {
          error,
          sagaId,
          type: this.config.type,
          tenantId,
          currentStep: state.currentStep,
        },
        'Saga execution failed'
      );

      // Compensate if configured
      if (this.config.compensateOnFailure) {
        await this.compensate(state, tenantId, payload);
      }

      const duration = Date.now() - startTime;

      // Update persistence
      if (this.config.persistState && this.repository) {
        await this.repository.updateStatus(sagaId, state.status);
      }

      this.emit('saga:failed', { sagaId, error: errorMessage, duration });

      return createDataEnvelope(
        {
          success: false,
          sagaId,
          status: state.status,
          error: errorMessage,
          steps: state.steps,
          duration,
        },
        {
          source: 'SagaOrchestrator',
          actor: actorId,
          governanceVerdict: createVerdict(GovernanceResult.DENY, `Saga failed: ${errorMessage}`),
          classification: DataClassification.INTERNAL,
        }
      );
    }
  }

  /**
   * Resume a saga from persisted state
   */
  async resume(sagaId: string, tenantId: string): Promise<DataEnvelope<SagaResult<TResult>>> {
    if (!this.repository) {
      throw new Error('Repository not configured for saga resumption');
    }

    const instanceResult = await this.repository.findById(sagaId);
    if (!instanceResult.data) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    const instance = instanceResult.data;

    if (instance.status === 'completed' || instance.status === 'compensated') {
      return createDataEnvelope(
        {
          success: instance.status === 'completed',
          sagaId,
          status: instance.status as SagaStatus,
          steps: [],
          duration: 0,
        },
        {
          source: 'SagaOrchestrator',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Saga already completed'),
          classification: DataClassification.INTERNAL,
        }
      );
    }

    // Resume from current step
    return this.execute(tenantId, instance.payload as TPayload);
  }

  /**
   * Manually trigger compensation
   */
  async compensate(
    state: SagaState<TPayload>,
    tenantId: string,
    payload: TPayload
  ): Promise<void> {
    state.status = 'compensating';

    this.emit('saga:compensating', { sagaId: state.sagaId, fromStep: state.currentStep });

    logger.info(
      {
        sagaId: state.sagaId,
        type: this.config.type,
        fromStep: state.currentStep,
      },
      'Starting saga compensation'
    );

    // Update persistence
    if (this.config.persistState && this.repository) {
      await this.repository.updateStatus(state.sagaId, 'compensating');
    }

    // Compensate steps in reverse order
    for (let i = state.currentStep; i >= 0; i--) {
      const step = this.steps[i];

      if (!step.needsCompensation()) {
        continue;
      }

      const context: StepContext<TPayload> = {
        sagaId: state.sagaId,
        stepId: '',
        tenantId,
        payload,
        previousResults: state.results,
        metadata: {},
      };

      const result = await step.compensate(context);

      if (result.data.success) {
        this.emit('saga:step:compensated', {
          sagaId: state.sagaId,
          stepName: step.getName(),
          stepIndex: i,
        });
      } else {
        logger.error(
          {
            sagaId: state.sagaId,
            stepName: step.getName(),
            stepIndex: i,
            error: result.data.error,
          },
          'Step compensation failed - manual intervention required'
        );
      }

      state.steps[i] = step.getState();
    }

    state.status = 'compensated';
    state.completedAt = new Date().toISOString();

    // Update persistence
    if (this.config.persistState && this.repository) {
      await this.repository.updateStatus(state.sagaId, 'compensated');
    }

    logger.info(
      {
        sagaId: state.sagaId,
        type: this.config.type,
      },
      'Saga compensation completed'
    );
  }

  /**
   * Get saga configuration
   */
  getConfig(): SagaConfig {
    return { ...this.config };
  }

  /**
   * Get step count
   */
  getStepCount(): number {
    return this.steps.length;
  }
}

// ============================================================================
// Saga Builder
// ============================================================================

export class SagaBuilder<TPayload = unknown, TResult = unknown> {
  private orchestrator: SagaOrchestrator<TPayload, TResult>;

  constructor(type: string) {
    this.orchestrator = new SagaOrchestrator<TPayload, TResult>({ type });
  }

  description(desc: string): this {
    (this.orchestrator as any).config.description = desc;
    return this;
  }

  maxExecutionTime(ms: number): this {
    (this.orchestrator as any).config.maxExecutionTimeMs = ms;
    return this;
  }

  persistState(enabled: boolean): this {
    (this.orchestrator as any).config.persistState = enabled;
    return this;
  }

  compensateOnFailure(enabled: boolean): this {
    (this.orchestrator as any).config.compensateOnFailure = enabled;
    return this;
  }

  repository(repo: SagaRepository): this {
    this.orchestrator.setRepository(repo);
    return this;
  }

  step(sagaStep: SagaStep<TPayload, unknown>): this {
    this.orchestrator.addStep(sagaStep);
    return this;
  }

  build(): SagaOrchestrator<TPayload, TResult> {
    if (this.orchestrator.getStepCount() === 0) {
      throw new Error('Saga must have at least one step');
    }
    return this.orchestrator;
  }
}

export function createSaga<TPayload = unknown, TResult = unknown>(
  type: string
): SagaBuilder<TPayload, TResult> {
  return new SagaBuilder<TPayload, TResult>(type);
}

export default SagaOrchestrator;
