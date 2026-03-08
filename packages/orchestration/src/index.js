"use strict";
// @ts-nocheck
/**
 * Advanced Orchestration Patterns
 * Saga, Circuit Breaker, Event Sourcing, CQRS, and Bulkhead isolation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutHandler = exports.RetryHandler = exports.Bulkhead = exports.EventStore = exports.CircuitBreaker = exports.SagaOrchestrator = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
class SagaOrchestrator extends events_1.EventEmitter {
    sagas = new Map();
    executions = new Map();
    /**
     * Define a saga with its steps
     */
    defineSaga(sagaId, steps) {
        if (steps.length === 0) {
            throw new Error('Saga must have at least one step');
        }
        this.sagas.set(sagaId, steps);
        this.emit('saga.defined', { sagaId, steps: steps.length });
    }
    /**
     * Execute a saga
     */
    async executeSaga(sagaId, initialContext = {}) {
        const steps = this.sagas.get(sagaId);
        if (!steps) {
            throw new Error('Saga not found');
        }
        const executionId = (0, uuid_1.v4)();
        const execution = {
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
                    const result = await this.executeStepWithTimeout(step.transaction, execution.context, step.timeout);
                    // Update context with result
                    execution.context[`step_${i}_result`] = result;
                    execution.completedSteps.push(i);
                    this.emit('saga.step.completed', { execution, step: i, result });
                }
                catch (error) {
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
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Execute step with timeout
     */
    async executeStepWithTimeout(fn, context, timeout) {
        if (!timeout) {
            return fn(context);
        }
        return Promise.race([
            fn(context),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Step timeout')), timeout)),
        ]);
    }
    /**
     * Compensate completed steps
     */
    async compensate(execution, steps) {
        this.emit('saga.compensation.started', execution);
        // Compensate in reverse order
        for (let i = execution.completedSteps.length - 1; i >= 0; i--) {
            const stepIndex = execution.completedSteps[i];
            const step = steps[stepIndex];
            try {
                await step.compensation(execution.context);
                this.emit('saga.step.compensated', { execution, step: stepIndex });
            }
            catch (error) {
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
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
}
exports.SagaOrchestrator = SagaOrchestrator;
class CircuitBreaker extends events_1.EventEmitter {
    name;
    config;
    state = 'closed';
    failureCount = 0;
    successCount = 0;
    lastFailureTime;
    nextAttemptTime;
    constructor(name, config) {
        super();
        this.name = name;
        this.config = config;
    }
    /**
     * Execute a function with circuit breaker protection
     */
    async execute(fn) {
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
        }
        catch (error) {
            // Failure - handle state transitions
            this.onFailure();
            throw error;
        }
    }
    /**
     * Handle successful execution
     */
    onSuccess() {
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
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === 'half-open') {
            this.open();
        }
        else if (this.failureCount >= this.config.failureThreshold) {
            this.open();
        }
    }
    /**
     * Open the circuit
     */
    open() {
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
    close() {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        this.emit('state.changed', { name: this.name, state: 'closed' });
        this.emit('circuit.closed', { name: this.name });
    }
    /**
     * Get current state
     */
    getState() {
        return this.state;
    }
    /**
     * Get metrics
     */
    getMetrics() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
        };
    }
    /**
     * Reset circuit breaker
     */
    reset() {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
        this.nextAttemptTime = undefined;
        this.emit('circuit.reset', { name: this.name });
    }
}
exports.CircuitBreaker = CircuitBreaker;
class EventStore extends events_1.EventEmitter {
    events = [];
    snapshots = new Map();
    eventHandlers = new Map();
    /**
     * Append an event to the store
     */
    async appendEvent(aggregateId, aggregateType, eventType, data, metadata) {
        // Get current version for this aggregate
        const currentEvents = this.events.filter((e) => e.aggregateId === aggregateId);
        const version = currentEvents.length + 1;
        const event = {
            id: (0, uuid_1.v4)(),
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
    getEvents(aggregateId, fromVersion = 0) {
        return this.events
            .filter((e) => e.aggregateId === aggregateId && e.version > fromVersion)
            .sort((a, b) => a.version - b.version);
    }
    /**
     * Get all events of a specific type
     */
    getEventsByType(eventType) {
        return this.events
            .filter((e) => e.type === eventType)
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    /**
     * Save a snapshot
     */
    saveSnapshot(snapshot) {
        const fullSnapshot = {
            ...snapshot,
            timestamp: new Date(),
        };
        this.snapshots.set(snapshot.aggregateId, fullSnapshot);
        this.emit('snapshot.saved', fullSnapshot);
    }
    /**
     * Get latest snapshot for an aggregate
     */
    getSnapshot(aggregateId) {
        return this.snapshots.get(aggregateId);
    }
    /**
     * Rebuild state from events
     */
    async rebuildState(aggregateId, reducer, initialState) {
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
    subscribe(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }
    /**
     * Notify event handlers
     */
    notifyHandlers(eventType, event) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(event);
                }
                catch (error) {
                    this.emit('handler.error', { eventType, event, error });
                }
            });
        }
    }
    /**
     * Get all events
     */
    getAllEvents() {
        return [...this.events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
}
exports.EventStore = EventStore;
// ==================== BULKHEAD PATTERN ====================
class Bulkhead extends events_1.EventEmitter {
    name;
    maxConcurrent;
    maxQueue;
    activeRequests = 0;
    queue = [];
    constructor(name, maxConcurrent, maxQueue = 100) {
        super();
        this.name = name;
        this.maxConcurrent = maxConcurrent;
        this.maxQueue = maxQueue;
    }
    /**
     * Execute function with bulkhead isolation
     */
    async execute(fn) {
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
    async executeNow(fn) {
        this.activeRequests++;
        this.emit('execution.started', {
            name: this.name,
            active: this.activeRequests,
        });
        try {
            const result = await fn();
            return result;
        }
        finally {
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
    processQueue() {
        while (this.queue.length > 0 &&
            this.activeRequests < this.maxConcurrent) {
            const item = this.queue.shift();
            this.executeNow(item.fn)
                .then(item.resolve)
                .catch(item.reject);
        }
    }
    /**
     * Get metrics
     */
    getMetrics() {
        return {
            activeRequests: this.activeRequests,
            queueSize: this.queue.length,
            capacity: this.maxConcurrent,
        };
    }
}
exports.Bulkhead = Bulkhead;
class RetryHandler {
    static async executeWithRetry(fn, policy) {
        let lastError;
        let delay = policy.initialDelay;
        for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                // Check if error is retryable
                if (policy.retryableErrors &&
                    !policy.retryableErrors.includes(error.code)) {
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
exports.RetryHandler = RetryHandler;
// ==================== TIMEOUT POLICY ====================
class TimeoutHandler {
    static async executeWithTimeout(fn, timeoutMs) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)),
        ]);
    }
}
exports.TimeoutHandler = TimeoutHandler;
__exportStar(require("./publicHealthPlan.js"), exports);
