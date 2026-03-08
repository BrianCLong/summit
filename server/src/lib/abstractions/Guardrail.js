"use strict";
// @ts-nocheck
/**
 * Guardrail Abstraction
 *
 * Provides a standardized way to enforce input/output validation, sanitization,
 * and policy checks across any service method.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardrailPipeline = void 0;
class GuardrailPipeline {
    inputGuards = [];
    outputGuards = [];
    /**
     * Add a guard that validates and optionally transforms the input.
     */
    addInputGuard(guard) {
        this.inputGuards.push(guard);
        return this;
    }
    /**
     * Add a guard that validates and optionally transforms the output.
     */
    addOutputGuard(guard) {
        this.outputGuards.push(guard);
        return this;
    }
    /**
     * Execute the protected function through the guardrail pipeline.
     */
    async execute(input, executor, context) {
        // Input Guards
        let currentInput = input;
        for (const guard of this.inputGuards) {
            const result = await guard.validate(currentInput, context);
            if (!result.allowed) {
                const error = new Error(`Guardrail blocked input: ${result.reason}`);
                error.code = 'GUARDRAIL_VIOLATION';
                error.metadata = result.metadata;
                throw error;
            }
            currentInput = result.data;
        }
        // Execution
        const output = await executor(currentInput);
        // Output Guards
        let currentOutput = output;
        for (const guard of this.outputGuards) {
            const result = await guard.validate(currentOutput, context);
            if (!result.allowed) {
                const error = new Error(`Guardrail blocked output: ${result.reason}`);
                error.code = 'GUARDRAIL_VIOLATION';
                error.metadata = result.metadata;
                throw error;
            }
            currentOutput = result.data;
        }
        return currentOutput;
    }
}
exports.GuardrailPipeline = GuardrailPipeline;
