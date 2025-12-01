/**
 * SagaOrchestrator - Coordinate distributed transactions with compensation
 *
 * Implements saga orchestration pattern for managing long-running transactions
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import pino from 'pino';
import type {
  SagaDefinition,
  SagaContext,
  SagaState,
  SagaStatus,
  SagaEvent,
  SagaStep
} from './types.js';

export class SagaOrchestrator extends EventEmitter {
  private sagas: Map<string, SagaDefinition> = new Map();
  private runningStates: Map<string, SagaState> = new Map();
  private redis: Redis;
  private logger: pino.Logger;

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.logger = pino({ name: 'SagaOrchestrator' });
  }

  /**
   * Define a saga
   */
  defineSaga(definition: SagaDefinition): void {
    this.sagas.set(definition.sagaId, definition);

    this.logger.info(
      { sagaId: definition.sagaId, name: definition.name },
      'Saga defined'
    );
  }

  /**
   * Start saga execution
   */
  async execute(
    sagaId: string,
    initialData: Record<string, any> = {},
    correlationId?: string
  ): Promise<SagaState> {
    const definition = this.sagas.get(sagaId);
    if (!definition) {
      throw new Error(`Saga not found: ${sagaId}`);
    }

    const instanceId = uuidv4();
    const context: SagaContext = {
      sagaId: instanceId,
      correlationId: correlationId || uuidv4(),
      data: new Map(Object.entries(initialData)),
      startedAt: new Date(),
      completedSteps: []
    };

    const state: SagaState = {
      sagaId: instanceId,
      sagaName: definition.name,
      status: 'running' as SagaStatus,
      context,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.runningStates.set(instanceId, state);
    await this.saveState(state);

    this.emitEvent({
      eventType: 'saga.started',
      sagaId: instanceId,
      timestamp: new Date(),
      data: initialData
    });

    // Execute steps
    this.executeSteps(definition, state).catch(err => {
      this.logger.error({ err, sagaId: instanceId }, 'Saga execution failed');
    });

    return state;
  }

  /**
   * Execute saga steps sequentially
   */
  private async executeSteps(
    definition: SagaDefinition,
    state: SagaState
  ): Promise<void> {
    this.logger.info(
      { sagaId: state.sagaId, steps: definition.steps.length },
      'Executing saga steps'
    );

    try {
      for (const step of definition.steps) {
        state.context.currentStep = step.stepId;
        await this.saveState(state);

        const success = await this.executeStep(step, state);

        if (success) {
          state.context.completedSteps.push(step.stepId);
          await this.saveState(state);

          this.emitEvent({
            eventType: 'saga.step.completed',
            sagaId: state.sagaId,
            stepId: step.stepId,
            timestamp: new Date()
          });
        } else {
          // Step failed - compensate
          await this.compensate(definition, state, step.stepId);
          return;
        }
      }

      // All steps completed
      state.status = 'completed' as SagaStatus;
      state.completedAt = new Date();
      state.updatedAt = new Date();
      await this.saveState(state);

      this.emitEvent({
        eventType: 'saga.completed',
        sagaId: state.sagaId,
        timestamp: new Date()
      });

      this.logger.info({ sagaId: state.sagaId }, 'Saga completed');
    } catch (err) {
      this.logger.error({ err, sagaId: state.sagaId }, 'Saga execution error');
      state.status = 'failed' as SagaStatus;
      await this.saveState(state);

      this.emitEvent({
        eventType: 'saga.failed',
        sagaId: state.sagaId,
        timestamp: new Date(),
        data: { error: (err as Error).message }
      });
    }
  }

  /**
   * Execute a single saga step with retries
   */
  private async executeStep(
    step: SagaStep,
    state: SagaState
  ): Promise<boolean> {
    const maxAttempts = step.retry?.maxAttempts || 1;
    const delay = step.retry?.delay || 1000;
    const backoff = step.retry?.backoff || 'linear';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(
          { sagaId: state.sagaId, stepId: step.stepId, attempt },
          'Executing step'
        );

        const result = await step.action(state.context);

        // Store result in context
        state.context.data.set(`${step.stepId}.result`, result);

        return true;
      } catch (err) {
        this.logger.error(
          { err, sagaId: state.sagaId, stepId: step.stepId, attempt },
          'Step execution failed'
        );

        if (attempt < maxAttempts) {
          // Calculate backoff
          const backoffDelay = backoff === 'exponential'
            ? delay * Math.pow(2, attempt - 1)
            : delay;

          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          // Max attempts reached
          state.context.failedStep = step.stepId;
          state.context.error = err;

          this.emitEvent({
            eventType: 'saga.step.failed',
            sagaId: state.sagaId,
            stepId: step.stepId,
            timestamp: new Date(),
            data: { error: (err as Error).message }
          });

          return false;
        }
      }
    }

    return false;
  }

  /**
   * Compensate completed steps in reverse order
   */
  private async compensate(
    definition: SagaDefinition,
    state: SagaState,
    failedStepId: string
  ): Promise<void> {
    this.logger.info(
      { sagaId: state.sagaId, failedStepId },
      'Compensating saga'
    );

    state.status = 'compensating' as SagaStatus;
    await this.saveState(state);

    this.emitEvent({
      eventType: 'saga.compensating',
      sagaId: state.sagaId,
      timestamp: new Date()
    });

    // Compensate completed steps in reverse
    const completedSteps = [...state.context.completedSteps].reverse();

    for (const stepId of completedSteps) {
      const step = definition.steps.find(s => s.stepId === stepId);

      if (step?.compensation) {
        try {
          this.logger.debug(
            { sagaId: state.sagaId, stepId },
            'Compensating step'
          );

          await step.compensation(state.context);
        } catch (err) {
          this.logger.error(
            { err, sagaId: state.sagaId, stepId },
            'Compensation failed'
          );
          // Continue with other compensations
        }
      }
    }

    state.status = 'compensated' as SagaStatus;
    state.updatedAt = new Date();
    await this.saveState(state);

    this.emitEvent({
      eventType: 'saga.compensated',
      sagaId: state.sagaId,
      timestamp: new Date()
    });

    this.logger.info({ sagaId: state.sagaId }, 'Saga compensated');
  }

  /**
   * Save saga state to Redis
   */
  private async saveState(state: SagaState): Promise<void> {
    const key = `saga:state:${state.sagaId}`;

    // Convert Map to object for serialization
    const contextData: Record<string, any> = {};
    state.context.data.forEach((value, key) => {
      contextData[key] = value;
    });

    const serialized = {
      ...state,
      context: {
        ...state.context,
        data: contextData
      }
    };

    await this.redis.setex(
      key,
      86400, // 24 hours
      JSON.stringify(serialized)
    );
  }

  /**
   * Load saga state from Redis
   */
  async loadState(sagaId: string): Promise<SagaState | null> {
    const key = `saga:state:${sagaId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data);

    // Convert data object back to Map
    const contextData = new Map(Object.entries(parsed.context.data || {}));

    return {
      ...parsed,
      context: {
        ...parsed.context,
        data: contextData
      }
    };
  }

  /**
   * Emit saga event
   */
  private emitEvent(event: SagaEvent): void {
    this.emit('saga:event', event);
    this.emit(event.eventType, event);
  }

  /**
   * Get saga state
   */
  getState(sagaId: string): SagaState | undefined {
    return this.runningStates.get(sagaId);
  }

  /**
   * Get all running sagas
   */
  getRunningSagas(): SagaState[] {
    return Array.from(this.runningStates.values());
  }
}
