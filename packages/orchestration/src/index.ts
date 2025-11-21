/**
 * Advanced Orchestration Patterns
 * Saga, Circuit Breaker, Event Sourcing, CQRS, and Bulkhead isolation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// ==================== SAGA PATTERN ====================

export interface SagaStep {
  id: string;
  name: string;
  transaction: (context: any) => Promise<any>;
  compensation: (context: any) => Promise<void>;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface SagaExecution {
  id: string;
  sagaId: string;
  status: 'running' | 'completed' | 'compensating' | 'compensated' | 'failed';
  currentStep?: number;
  completedSteps: number[];
  context: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: {
    step: number;
    message: string;
    timestamp: Date;
  };
}

export class SagaOrchestrator extends EventEmitter {
  private sagas = new Map<string, SagaStep[]>();
  private executions = new Map<string, SagaExecution>();

  /**
   * Define a saga with its steps
   */
  defineSaga(sagaId: string, steps: SagaStep[]): void {
    if (steps.length === 0) {
      throw new Error('Saga must have at least one step');
    }

    this.sagas.set(sagaId, steps);
    this.emit('saga.defined', { sagaId, steps: steps.length });
  }

  /**
   * Execute a saga
   */
  async executeSaga(
    sagaId: string,
    initialContext: Record<string, any> = {},
  ): Promise<SagaExecution> {
    const steps = this.sagas.get(sagaId);
    if (!steps) {
      throw new Error('Saga not found');
    }

    const executionId = uuidv4();
    const execution: SagaExecution = {
      id: executionId,
      sagaId,
      status: 'running',
      completedSteps: [],
      context: { ...initialContext },
      startedAt: new Date(),
    };

    this.executions.set(executionId, execution);
    this.emit('saga.started', execution);

    try {
      // Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        execution.currentStep = i;
        const step = steps[i];

        try {
          // Execute transaction
          const result = await this.executeStepWithTimeout(
            step.transaction,
            execution.context,
            step.timeout,
          );

          // Update context with result
          execution.context[`step_${i}_result`] = result;
          execution.completedSteps.push(i);

          this.emit('saga.step.completed', { execution, step: i, result });
        } catch (error: any) {
          // Step failed - initiate compensation
          execution.status = 'compensating';
          execution.error = {
            step: i,
            message: error.message,
            timestamp: new Date(),
          };

          this.emit('saga.step.failed', { execution, step: i, error });

          // Compensate all completed steps in reverse order
          await this.compensate(execution, steps);

          execution.status = 'failed';
          execution.completedAt = new Date();
          this.emit('saga.failed', execution);

          throw error;
        }
      }

      // All steps completed successfully
      execution.status = 'completed';
      execution.completedAt = new Date();
      this.emit('saga.completed', execution);

      return execution;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute step with timeout
   */
  private async executeStepWithTimeout(
    fn: (context: any) => Promise<any>,
    context: any,
    timeout?: number,
  ): Promise<any> {
    if (!timeout) {
      return fn(context);
    }

    return Promise.race([
      fn(context),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Step timeout')), timeout),
      ),
    ]);
  }

  /**
   * Compensate completed steps
   */
  private async compensate(
    execution: SagaExecution,
    steps: SagaStep[],
  ): Promise<void> {
    this.emit('saga.compensation.started', execution);

    // Compensate in reverse order
    for (let i = execution.completedSteps.length - 1; i >= 0; i--) {
      const stepIndex = execution.completedSteps[i];
      const step = steps[stepIndex];

      try {
        await step.compensation(execution.context);
        this.emit('saga.step.compensated', { execution, step: stepIndex });
      } catch (error: any) {
        this.emit('saga.compensation.error', {
          execution,
          step: stepIndex,
          error: error.message,
        });
        // Continue compensating other steps even if one fails
      }
    }

    execution.status = 'compensated';
    this.emit('saga.compensation.completed', execution);
  }

  /**
   * Get saga execution status
   */
  getExecution(executionId: string): SagaExecution | undefined {
    return this.executions.get(executionId);
  }
}

// ==================== CIRCUIT BREAKER ====================

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close
  timeout: number; // Timeout in ms before attempting to close
  monitoringPeriod: number; // Period to track failures
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig,
  ) {
    super();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      if (Date.now() < (this.nextAttemptTime || 0)) {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }

      // Timeout passed, move to half-open state
      this.state = 'half-open';
      this.emit('state.changed', { name: this.name, state: 'half-open' });
    }

    try {
      const result = await fn();

      // Success - handle state transitions
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - handle state transitions
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.open();
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  private open(): void {
    this.state = 'open';
    this.nextAttemptTime = Date.now() + this.config.timeout;
    this.successCount = 0;

    this.emit('state.changed', { name: this.name, state: 'open' });
    this.emit('circuit.opened', {
      name: this.name,
      failures: this.failureCount,
    });
  }

  /**
   * Close the circuit
   */
  private close(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;

    this.emit('state.changed', { name: this.name, state: 'closed' });
    this.emit('circuit.closed', { name: this.name });
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;

    this.emit('circuit.reset', { name: this.name });
  }
}

// ==================== EVENT SOURCING ====================

export interface Event {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
  version: number;
}

export interface Snapshot {
  aggregateId: string;
  aggregateType: string;
  state: any;
  version: number;
  timestamp: Date;
}

export class EventStore extends EventEmitter {
  private events: Event[] = [];
  private snapshots = new Map<string, Snapshot>();
  private eventHandlers = new Map<string, Array<(event: Event) => void>>();

  /**
   * Append an event to the store
   */
  async appendEvent(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    data: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<Event> {
    // Get current version for this aggregate
    const currentEvents = this.events.filter(
      (e) => e.aggregateId === aggregateId,
    );
    const version = currentEvents.length + 1;

    const event: Event = {
      id: uuidv4(),
      type: eventType,
      aggregateId,
      aggregateType,
      data,
      metadata,
      timestamp: new Date(),
      version,
    };

    this.events.push(event);

    // Emit to subscribers
    this.emit('event.appended', event);
    this.notifyHandlers(eventType, event);

    return event;
  }

  /**
   * Get events for an aggregate
   */
  getEvents(
    aggregateId: string,
    fromVersion: number = 0,
  ): Event[] {
    return this.events
      .filter(
        (e) => e.aggregateId === aggregateId && e.version > fromVersion,
      )
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Get all events of a specific type
   */
  getEventsByType(eventType: string): Event[] {
    return this.events
      .filter((e) => e.type === eventType)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Save a snapshot
   */
  saveSnapshot(snapshot: Omit<Snapshot, 'timestamp'>): void {
    const fullSnapshot: Snapshot = {
      ...snapshot,
      timestamp: new Date(),
    };

    this.snapshots.set(snapshot.aggregateId, fullSnapshot);
    this.emit('snapshot.saved', fullSnapshot);
  }

  /**
   * Get latest snapshot for an aggregate
   */
  getSnapshot(aggregateId: string): Snapshot | undefined {
    return this.snapshots.get(aggregateId);
  }

  /**
   * Rebuild state from events
   */
  async rebuildState<T>(
    aggregateId: string,
    reducer: (state: T, event: Event) => T,
    initialState: T,
  ): Promise<T> {
    // Check for snapshot
    const snapshot = this.getSnapshot(aggregateId);
    let state = snapshot ? snapshot.state : initialState;
    const fromVersion = snapshot ? snapshot.version : 0;

    // Apply events after snapshot
    const events = this.getEvents(aggregateId, fromVersion);

    for (const event of events) {
      state = reducer(state, event);
    }

    return state;
  }

  /**
   * Subscribe to events
   */
  subscribe(eventType: string, handler: (event: Event) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Notify event handlers
   */
  private notifyHandlers(eventType: string, event: Event): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          this.emit('handler.error', { eventType, event, error });
        }
      });
    }
  }

  /**
   * Get all events
   */
  getAllEvents(): Event[] {
    return [...this.events].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }
}

// ==================== BULKHEAD PATTERN ====================

export class Bulkhead extends EventEmitter {
  private activeRequests = 0;
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(
    private name: string,
    private maxConcurrent: number,
    private maxQueue: number = 100,
  ) {
    super();
  }

  /**
   * Execute function with bulkhead isolation
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we can execute immediately
    if (this.activeRequests < this.maxConcurrent) {
      return this.executeNow(fn);
    }

    // Check queue capacity
    if (this.queue.length >= this.maxQueue) {
      throw new Error(`Bulkhead ${this.name} queue is full`);
    }

    // Add to queue
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.emit('queued', {
        name: this.name,
        queueSize: this.queue.length,
      });
    });
  }

  /**
   * Execute function immediately
   */
  private async executeNow<T>(fn: () => Promise<T>): Promise<T> {
    this.activeRequests++;
    this.emit('execution.started', {
      name: this.name,
      active: this.activeRequests,
    });

    try {
      const result = await fn();
      return result;
    } finally {
      this.activeRequests--;
      this.emit('execution.completed', {
        name: this.name,
        active: this.activeRequests,
      });

      // Process queue
      this.processQueue();
    }
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    while (
      this.queue.length > 0 &&
      this.activeRequests < this.maxConcurrent
    ) {
      const item = this.queue.shift()!;

      this.executeNow(item.fn)
        .then(item.resolve)
        .catch(item.reject);
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    activeRequests: number;
    queueSize: number;
    capacity: number;
  } {
    return {
      activeRequests: this.activeRequests,
      queueSize: this.queue.length,
      capacity: this.maxConcurrent,
    };
  }
}

// ==================== RETRY POLICY ====================

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export class RetryHandler {
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    policy: RetryPolicy,
  ): Promise<T> {
    let lastError: any;
    let delay = policy.initialDelay;

    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (
          policy.retryableErrors &&
          !policy.retryableErrors.includes(error.code)
        ) {
          throw error;
        }

        // Check if we should retry
        if (attempt < policy.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelay);
        }
      }
    }

    throw lastError;
  }
}

// ==================== TIMEOUT POLICY ====================

export class TimeoutHandler {
  static async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs),
      ),
    ]);
  }
}

export {
  SagaOrchestrator,
  CircuitBreaker,
  EventStore,
  Bulkhead,
  RetryHandler,
  TimeoutHandler,
};
