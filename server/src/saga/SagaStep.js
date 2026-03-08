"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaStepBuilder = exports.SagaStep = void 0;
exports.createStep = createStep;
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
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
class SagaStep {
    definition;
    state;
    constructor(definition) {
        this.definition = definition;
        this.state = {
            stepId: (0, uuid_1.v4)(),
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
    async execute(context) {
        this.state.status = 'running';
        this.state.startedAt = new Date().toISOString();
        this.state.attempts++;
        const stepContext = {
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
            let result;
            if (this.definition.timeoutMs) {
                result = await this.executeWithTimeout(() => this.definition.execute(stepContext), this.definition.timeoutMs);
            }
            else {
                result = await this.definition.execute(stepContext);
            }
            if (result.success) {
                this.state.status = 'completed';
                this.state.completedAt = new Date().toISOString();
                this.state.result = result.result;
                this.state.compensationData = result.compensationData;
                logger_js_1.default.info({
                    sagaId: context.sagaId,
                    stepId: this.state.stepId,
                    stepName: this.definition.name,
                    tenantId: context.tenantId,
                }, 'Saga step completed successfully');
                return (0, data_envelope_js_1.createDataEnvelope)(result, {
                    source: 'SagaStep',
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Step completed'),
                    classification: data_envelope_js_1.DataClassification.INTERNAL,
                });
            }
            else {
                throw new Error(result.error || 'Step execution failed');
            }
        }
        catch (error) {
            this.state.status = 'failed';
            this.state.error = error instanceof Error ? error.message : String(error);
            this.state.completedAt = new Date().toISOString();
            logger_js_1.default.error({
                error,
                sagaId: context.sagaId,
                stepId: this.state.stepId,
                stepName: this.definition.name,
                tenantId: context.tenantId,
                attempts: this.state.attempts,
            }, 'Saga step failed');
            // Check if we should retry
            const retryConfig = this.definition.retryConfig;
            if (retryConfig && this.state.attempts < retryConfig.maxRetries) {
                await this.sleep(retryConfig.backoffMs * this.state.attempts);
                return this.execute(context);
            }
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: false,
                error: this.state.error,
            }, {
                source: 'SagaStep',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Step failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    /**
     * Execute the step's compensation action
     */
    async compensate(context) {
        if (this.state.status !== 'completed' && this.state.status !== 'failed') {
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true }, {
                source: 'SagaStep',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'No compensation needed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        this.state.status = 'compensating';
        const stepContext = {
            ...context,
            stepId: this.state.stepId,
        };
        try {
            const result = await this.definition.compensate(stepContext, this.state.compensationData);
            if (result.success) {
                this.state.status = 'compensated';
                logger_js_1.default.info({
                    sagaId: context.sagaId,
                    stepId: this.state.stepId,
                    stepName: this.definition.name,
                    tenantId: context.tenantId,
                }, 'Saga step compensated');
                return (0, data_envelope_js_1.createDataEnvelope)(result, {
                    source: 'SagaStep',
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Step compensated'),
                    classification: data_envelope_js_1.DataClassification.INTERNAL,
                });
            }
            else {
                throw new Error(result.error || 'Compensation failed');
            }
        }
        catch (error) {
            logger_js_1.default.error({
                error,
                sagaId: context.sagaId,
                stepId: this.state.stepId,
                stepName: this.definition.name,
                tenantId: context.tenantId,
            }, 'Saga step compensation failed');
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            }, {
                source: 'SagaStep',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Compensation failed - manual intervention required'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    /**
     * Get current step state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get step name
     */
    getName() {
        return this.definition.name;
    }
    /**
     * Get step description
     */
    getDescription() {
        return this.definition.description;
    }
    /**
     * Check if step needs compensation
     */
    needsCompensation() {
        return this.state.status === 'completed' || this.state.status === 'failed';
    }
    /**
     * Reset step to pending state
     */
    reset() {
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
    async executeWithTimeout(operation, timeoutMs) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`Step timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        try {
            const result = await Promise.race([operation(), timeoutPromise]);
            clearTimeout(timeoutId);
            return result;
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.SagaStep = SagaStep;
// ============================================================================
// Step Builder
// ============================================================================
class SagaStepBuilder {
    definition = {};
    constructor(name) {
        this.definition.name = name;
    }
    description(desc) {
        this.definition.description = desc;
        return this;
    }
    execute(fn) {
        this.definition.execute = fn;
        return this;
    }
    compensate(fn) {
        this.definition.compensate = fn;
        return this;
    }
    validate(fn) {
        this.definition.validate = fn;
        return this;
    }
    retry(maxRetries, backoffMs = 1000) {
        this.definition.retryConfig = { maxRetries, backoffMs };
        return this;
    }
    timeout(timeoutMs) {
        this.definition.timeoutMs = timeoutMs;
        return this;
    }
    build() {
        if (!this.definition.name) {
            throw new Error('Step name is required');
        }
        if (!this.definition.execute) {
            throw new Error('Step execute function is required');
        }
        if (!this.definition.compensate) {
            throw new Error('Step compensate function is required');
        }
        return new SagaStep(this.definition);
    }
}
exports.SagaStepBuilder = SagaStepBuilder;
function createStep(name) {
    return new SagaStepBuilder(name);
}
exports.default = SagaStep;
