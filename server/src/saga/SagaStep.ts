/**
 * Saga Step Definition
 *
 * Defines the interface for saga steps with forward and compensation actions.
 * Each step is designed to be idempotent and support rollback.
 *
 * SOC 2 Controls: CC5.2 (Process Integrity), CC7.2 (Change Management)
 *
 * @module saga/SagaStep
 */

import { v4 as uuidv4 } from 'uuid';
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

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';

export interface StepContext<TPayload = unknown> {
  sagaId: string;
  stepId: string;
  tenantId: string;
  payload: TPayload;
  previousResults: Map<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface StepResult<TResult = unknown> {
  success: boolean;
  result?: TResult;
  error?: string;
  compensationData?: unknown;
}

export interface StepDefinition<TPayload = unknown, TResult = unknown> {
  /** Unique step name */
  name: string;
  /** Step description for audit */
  description: string;
  /** Forward action */
  execute: (context: StepContext<TPayload>) => Promise<StepResult<TResult>>;
  /** Compensation/rollback action */
  compensate: (context: StepContext<TPayload>, compensationData: unknown) => Promise<StepResult<void>>;
  /** Optional validation before execution */
  validate?: (context: StepContext<TPayload>) => Promise<boolean>;
  /** Retry configuration for this step */
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
  /** Timeout for step execution in ms */
  timeoutMs?: number;
}

export interface StepState {
  stepId: string;
  name: string;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  result?: unknown;
  error?: string;
  compensationData?: unknown;
  attempts: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'saga-step-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'SagaStep',
  };
}

// ============================================================================
// Saga Step Implementation
// ============================================================================

export class SagaStep<TPayload = unknown, TResult = unknown> {
  private definition: StepDefinition<TPayload, TResult>;
  private state: StepState;

  constructor(definition: StepDefinition<TPayload, TResult>) {
    this.definition = definition;
    this.state = {
      stepId: uuidv4(),
      name: definition.name,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      attempts: 0,
    };
  }

  /**
   * Execute the step's forward action
   */
  async execute(context: StepContext<TPayload>): Promise<DataEnvelope<StepResult<TResult>>> {
    this.state.status = 'running';
    this.state.startedAt = new Date().toISOString();
    this.state.attempts++;

    const stepContext: StepContext<TPayload> = {
      ...context,
      stepId: this.state.stepId,
    };

    try {
      // Validate if validator is defined
      if (this.definition.validate) {
        const isValid = await this.definition.validate(stepContext);
        if (!isValid) {
          throw new Error(`Step validation failed: ${this.definition.name}`);
        }
      }

      // Execute with optional timeout
      let result: StepResult<TResult>;

      if (this.definition.timeoutMs) {
        result = await this.executeWithTimeout(
          () => this.definition.execute(stepContext),
          this.definition.timeoutMs
        );
      } else {
        result = await this.definition.execute(stepContext);
      }

      if (result.success) {
        this.state.status = 'completed';
        this.state.completedAt = new Date().toISOString();
        this.state.result = result.result;
        this.state.compensationData = result.compensationData;

        logger.info(
          {
            sagaId: context.sagaId,
            stepId: this.state.stepId,
            stepName: this.definition.name,
            tenantId: context.tenantId,
          },
          'Saga step completed successfully'
        );

        return createDataEnvelope(result, {
          source: 'SagaStep',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Step completed'),
          classification: DataClassification.INTERNAL,
        });
      } else {
        throw new Error(result.error || 'Step execution failed');
      }
    } catch (error: any) {
      this.state.status = 'failed';
      this.state.error = error instanceof Error ? error.message : String(error);
      this.state.completedAt = new Date().toISOString();

      logger.error(
        {
          error,
          sagaId: context.sagaId,
          stepId: this.state.stepId,
          stepName: this.definition.name,
          tenantId: context.tenantId,
          attempts: this.state.attempts,
        },
        'Saga step failed'
      );

      // Check if we should retry
      const retryConfig = this.definition.retryConfig;
      if (retryConfig && this.state.attempts < retryConfig.maxRetries) {
        await this.sleep(retryConfig.backoffMs * this.state.attempts);
        return this.execute(context);
      }

      return createDataEnvelope(
        {
          success: false,
          error: this.state.error,
        },
        {
          source: 'SagaStep',
          governanceVerdict: createVerdict(GovernanceResult.DENY, 'Step failed'),
          classification: DataClassification.INTERNAL,
        }
      );
    }
  }

  /**
   * Execute the step's compensation action
   */
  async compensate(context: StepContext<TPayload>): Promise<DataEnvelope<StepResult<void>>> {
    if (this.state.status !== 'completed' && this.state.status !== 'failed') {
      return createDataEnvelope(
        { success: true },
        {
          source: 'SagaStep',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'No compensation needed'),
          classification: DataClassification.INTERNAL,
        }
      );
    }

    this.state.status = 'compensating';

    const stepContext: StepContext<TPayload> = {
      ...context,
      stepId: this.state.stepId,
    };

    try {
      const result = await this.definition.compensate(stepContext, this.state.compensationData);

      if (result.success) {
        this.state.status = 'compensated';

        logger.info(
          {
            sagaId: context.sagaId,
            stepId: this.state.stepId,
            stepName: this.definition.name,
            tenantId: context.tenantId,
          },
          'Saga step compensated'
        );

        return createDataEnvelope(result, {
          source: 'SagaStep',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Step compensated'),
          classification: DataClassification.INTERNAL,
        });
      } else {
        throw new Error(result.error || 'Compensation failed');
      }
    } catch (error: any) {
      logger.error(
        {
          error,
          sagaId: context.sagaId,
          stepId: this.state.stepId,
          stepName: this.definition.name,
          tenantId: context.tenantId,
        },
        'Saga step compensation failed'
      );

      return createDataEnvelope(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        {
          source: 'SagaStep',
          governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Compensation failed - manual intervention required'),
          classification: DataClassification.INTERNAL,
        }
      );
    }
  }

  /**
   * Get current step state
   */
  getState(): StepState {
    return { ...this.state };
  }

  /**
   * Get step name
   */
  getName(): string {
    return this.definition.name;
  }

  /**
   * Get step description
   */
  getDescription(): string {
    return this.definition.description;
  }

  /**
   * Check if step needs compensation
   */
  needsCompensation(): boolean {
    return this.state.status === 'completed' || this.state.status === 'failed';
  }

  /**
   * Reset step to pending state
   */
  reset(): void {
    this.state = {
      stepId: this.state.stepId,
      name: this.definition.name,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      attempts: 0,
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Step timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Step Builder
// ============================================================================

export class SagaStepBuilder<TPayload = unknown, TResult = unknown> {
  private definition: Partial<StepDefinition<TPayload, TResult>> = {};

  constructor(name: string) {
    this.definition.name = name;
  }

  description(desc: string): this {
    this.definition.description = desc;
    return this;
  }

  execute(fn: StepDefinition<TPayload, TResult>['execute']): this {
    this.definition.execute = fn;
    return this;
  }

  compensate(fn: StepDefinition<TPayload, TResult>['compensate']): this {
    this.definition.compensate = fn;
    return this;
  }

  validate(fn: StepDefinition<TPayload, TResult>['validate']): this {
    this.definition.validate = fn;
    return this;
  }

  retry(maxRetries: number, backoffMs: number = 1000): this {
    this.definition.retryConfig = { maxRetries, backoffMs };
    return this;
  }

  timeout(timeoutMs: number): this {
    this.definition.timeoutMs = timeoutMs;
    return this;
  }

  build(): SagaStep<TPayload, TResult> {
    if (!this.definition.name) {
      throw new Error('Step name is required');
    }
    if (!this.definition.execute) {
      throw new Error('Step execute function is required');
    }
    if (!this.definition.compensate) {
      throw new Error('Step compensate function is required');
    }

    return new SagaStep(this.definition as StepDefinition<TPayload, TResult>);
  }
}

export function createStep<TPayload = unknown, TResult = unknown>(
  name: string
): SagaStepBuilder<TPayload, TResult> {
  return new SagaStepBuilder<TPayload, TResult>(name);
}

export default SagaStep;
