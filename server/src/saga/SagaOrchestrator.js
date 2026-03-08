"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaBuilder = exports.SagaOrchestrator = void 0;
exports.createSaga = createSaga;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
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
class SagaOrchestrator extends events_1.EventEmitter {
    config;
    steps = [];
    repository = null;
    constructor(config) {
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
    setRepository(repository) {
        this.repository = repository;
        return this;
    }
    /**
     * Add a step to the saga
     */
    addStep(step) {
        this.steps.push(step);
        return this;
    }
    /**
     * Execute the saga
     */
    async execute(tenantId, payload, actorId) {
        const sagaId = (0, uuid_1.v4)();
        const startTime = Date.now();
        const state = {
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
                payload: payload,
                createdAt: new Date().toISOString(),
                tenantId,
            });
        }
        this.emit('saga:started', { sagaId, type: this.config.type, tenantId });
        logger_js_1.default.info({
            sagaId,
            type: this.config.type,
            tenantId,
            steps: this.steps.length,
            actorId,
        }, 'Saga started');
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
                const context = {
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
            const finalResult = state.results.get(this.steps[this.steps.length - 1].getName());
            this.emit('saga:completed', { sagaId, result: finalResult, duration });
            logger_js_1.default.info({
                sagaId,
                type: this.config.type,
                tenantId,
                duration,
            }, 'Saga completed successfully');
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: true,
                sagaId,
                status: 'completed',
                result: finalResult,
                steps: state.steps,
                duration,
            }, {
                source: 'SagaOrchestrator',
                actor: actorId,
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Saga completed successfully'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            state.status = 'failed';
            state.error = errorMessage;
            logger_js_1.default.error({
                error,
                sagaId,
                type: this.config.type,
                tenantId,
                currentStep: state.currentStep,
            }, 'Saga execution failed');
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
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: false,
                sagaId,
                status: state.status,
                error: errorMessage,
                steps: state.steps,
                duration,
            }, {
                source: 'SagaOrchestrator',
                actor: actorId,
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Saga failed: ${errorMessage}`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    /**
     * Resume a saga from persisted state
     */
    async resume(sagaId, tenantId) {
        if (!this.repository) {
            throw new Error('Repository not configured for saga resumption');
        }
        const instanceResult = await this.repository.findById(sagaId);
        if (!instanceResult.data) {
            throw new Error(`Saga ${sagaId} not found`);
        }
        const instance = instanceResult.data;
        if (instance.status === 'completed' || instance.status === 'compensated') {
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: instance.status === 'completed',
                sagaId,
                status: instance.status,
                steps: [],
                duration: 0,
            }, {
                source: 'SagaOrchestrator',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Saga already completed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Resume from current step
        return this.execute(tenantId, instance.payload);
    }
    /**
     * Manually trigger compensation
     */
    async compensate(state, tenantId, payload) {
        state.status = 'compensating';
        this.emit('saga:compensating', { sagaId: state.sagaId, fromStep: state.currentStep });
        logger_js_1.default.info({
            sagaId: state.sagaId,
            type: this.config.type,
            fromStep: state.currentStep,
        }, 'Starting saga compensation');
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
            const context = {
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
            }
            else {
                logger_js_1.default.error({
                    sagaId: state.sagaId,
                    stepName: step.getName(),
                    stepIndex: i,
                    error: result.data.error,
                }, 'Step compensation failed - manual intervention required');
            }
            state.steps[i] = step.getState();
        }
        state.status = 'compensated';
        state.completedAt = new Date().toISOString();
        // Update persistence
        if (this.config.persistState && this.repository) {
            await this.repository.updateStatus(state.sagaId, 'compensated');
        }
        logger_js_1.default.info({
            sagaId: state.sagaId,
            type: this.config.type,
        }, 'Saga compensation completed');
    }
    /**
     * Get saga configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get step count
     */
    getStepCount() {
        return this.steps.length;
    }
}
exports.SagaOrchestrator = SagaOrchestrator;
// ============================================================================
// Saga Builder
// ============================================================================
class SagaBuilder {
    orchestrator;
    constructor(type) {
        this.orchestrator = new SagaOrchestrator({ type });
    }
    description(desc) {
        this.orchestrator.config.description = desc;
        return this;
    }
    maxExecutionTime(ms) {
        this.orchestrator.config.maxExecutionTimeMs = ms;
        return this;
    }
    persistState(enabled) {
        this.orchestrator.config.persistState = enabled;
        return this;
    }
    compensateOnFailure(enabled) {
        this.orchestrator.config.compensateOnFailure = enabled;
        return this;
    }
    repository(repo) {
        this.orchestrator.setRepository(repo);
        return this;
    }
    step(sagaStep) {
        this.orchestrator.addStep(sagaStep);
        return this;
    }
    build() {
        if (this.orchestrator.getStepCount() === 0) {
            throw new Error('Saga must have at least one step');
        }
        return this.orchestrator;
    }
}
exports.SagaBuilder = SagaBuilder;
function createSaga(type) {
    return new SagaBuilder(type);
}
exports.default = SagaOrchestrator;
