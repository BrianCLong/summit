"use strict";
/**
 * SagaOrchestrator - Coordinate distributed transactions with compensation
 *
 * Implements saga orchestration pattern for managing long-running transactions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaOrchestrator = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
class SagaOrchestrator extends events_1.EventEmitter {
    sagas = new Map();
    runningStates = new Map();
    redis;
    logger;
    constructor(redis) {
        super();
        this.redis = redis;
        this.logger = (0, pino_1.default)({ name: 'SagaOrchestrator' });
    }
    /**
     * Define a saga
     */
    defineSaga(definition) {
        this.sagas.set(definition.sagaId, definition);
        this.logger.info({ sagaId: definition.sagaId, name: definition.name }, 'Saga defined');
    }
    /**
     * Start saga execution
     */
    async execute(sagaId, initialData = {}, correlationId) {
        const definition = this.sagas.get(sagaId);
        if (!definition) {
            throw new Error(`Saga not found: ${sagaId}`);
        }
        const instanceId = (0, uuid_1.v4)();
        const context = {
            sagaId: instanceId,
            correlationId: correlationId || (0, uuid_1.v4)(),
            data: new Map(Object.entries(initialData)),
            startedAt: new Date(),
            completedSteps: []
        };
        const state = {
            sagaId: instanceId,
            sagaName: definition.name,
            status: 'running',
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
    async executeSteps(definition, state) {
        this.logger.info({ sagaId: state.sagaId, steps: definition.steps.length }, 'Executing saga steps');
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
                }
                else {
                    // Step failed - compensate
                    await this.compensate(definition, state, step.stepId);
                    return;
                }
            }
            // All steps completed
            state.status = 'completed';
            state.completedAt = new Date();
            state.updatedAt = new Date();
            await this.saveState(state);
            this.emitEvent({
                eventType: 'saga.completed',
                sagaId: state.sagaId,
                timestamp: new Date()
            });
            this.logger.info({ sagaId: state.sagaId }, 'Saga completed');
        }
        catch (err) {
            this.logger.error({ err, sagaId: state.sagaId }, 'Saga execution error');
            state.status = 'failed';
            await this.saveState(state);
            this.emitEvent({
                eventType: 'saga.failed',
                sagaId: state.sagaId,
                timestamp: new Date(),
                data: { error: err.message }
            });
        }
    }
    /**
     * Execute a single saga step with retries
     */
    async executeStep(step, state) {
        const maxAttempts = step.retry?.maxAttempts || 1;
        const delay = step.retry?.delay || 1000;
        const backoff = step.retry?.backoff || 'linear';
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                this.logger.debug({ sagaId: state.sagaId, stepId: step.stepId, attempt }, 'Executing step');
                const result = await step.action(state.context);
                // Store result in context
                state.context.data.set(`${step.stepId}.result`, result);
                return true;
            }
            catch (err) {
                this.logger.error({ err, sagaId: state.sagaId, stepId: step.stepId, attempt }, 'Step execution failed');
                if (attempt < maxAttempts) {
                    // Calculate backoff
                    const backoffDelay = backoff === 'exponential'
                        ? delay * Math.pow(2, attempt - 1)
                        : delay;
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                }
                else {
                    // Max attempts reached
                    state.context.failedStep = step.stepId;
                    state.context.error = err;
                    this.emitEvent({
                        eventType: 'saga.step.failed',
                        sagaId: state.sagaId,
                        stepId: step.stepId,
                        timestamp: new Date(),
                        data: { error: err.message }
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
    async compensate(definition, state, failedStepId) {
        this.logger.info({ sagaId: state.sagaId, failedStepId }, 'Compensating saga');
        state.status = 'compensating';
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
                    this.logger.debug({ sagaId: state.sagaId, stepId }, 'Compensating step');
                    await step.compensation(state.context);
                }
                catch (err) {
                    this.logger.error({ err, sagaId: state.sagaId, stepId }, 'Compensation failed');
                    // Continue with other compensations
                }
            }
        }
        state.status = 'compensated';
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
    async saveState(state) {
        const key = `saga:state:${state.sagaId}`;
        // Convert Map to object for serialization
        const contextData = {};
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
        await this.redis.setex(key, 86400, // 24 hours
        JSON.stringify(serialized));
    }
    /**
     * Load saga state from Redis
     */
    async loadState(sagaId) {
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
    emitEvent(event) {
        this.emit('saga:event', event);
        this.emit(event.eventType, event);
    }
    /**
     * Get saga state
     */
    getState(sagaId) {
        return this.runningStates.get(sagaId);
    }
    /**
     * Get all running sagas
     */
    getRunningSagas() {
        return Array.from(this.runningStates.values());
    }
}
exports.SagaOrchestrator = SagaOrchestrator;
