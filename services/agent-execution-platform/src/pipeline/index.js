"use strict";
/**
 * Execution Pipeline Engine - DAG-based workflow execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineEngine = exports.PipelineEngine = void 0;
const index_js_1 = require("../logging/index.js");
class PipelineEngine {
    executions;
    constructor() {
        this.executions = new Map();
    }
    async execute(definition, context) {
        const executionId = this.generateExecutionId();
        index_js_1.logger.getLogger().info('Starting pipeline execution', {
            pipelineId: definition.id,
            executionId,
            stepCount: definition.steps.length,
        });
        const execution = {
            id: executionId,
            pipelineId: definition.id,
            status: 'running',
            startTime: new Date(),
            steps: definition.steps.map((step) => ({
                stepId: step.id,
                status: 'pending',
                attempts: 0,
            })),
            context,
        };
        this.executions.set(executionId, execution);
        try {
            // Build dependency graph
            const graph = this.buildDependencyGraph(definition.steps);
            // Execute steps according to dependencies
            await this.executeGraph(execution, definition, graph);
            execution.status = 'completed';
            execution.endTime = new Date();
            index_js_1.logger.getLogger().info('Pipeline execution completed successfully', {
                executionId,
                durationMs: execution.endTime.getTime() - execution.startTime.getTime(),
            });
        }
        catch (error) {
            execution.status = 'failed';
            execution.endTime = new Date();
            index_js_1.logger.getLogger().error('Pipeline execution failed', error, {
                executionId,
            });
            throw error;
        }
        return execution;
    }
    async executeGraph(execution, definition, graph) {
        const completed = new Set();
        const executing = new Set();
        while (completed.size < definition.steps.length) {
            // Find steps ready to execute
            const ready = this.findReadySteps(definition.steps, graph, completed, executing);
            if (ready.length === 0) {
                // Check if we're stuck
                if (executing.size === 0) {
                    throw new Error('Pipeline execution stuck - circular dependency detected');
                }
                // Wait for executing steps to complete
                await new Promise((resolve) => setTimeout(resolve, 100));
                continue;
            }
            // Execute ready steps
            await Promise.all(ready.map(async (step) => {
                executing.add(step.id);
                try {
                    await this.executeStep(execution, step, definition);
                    completed.add(step.id);
                }
                catch (error) {
                    // Handle error according to strategy
                    const shouldContinue = await this.handleStepError(execution, step, error);
                    if (!shouldContinue) {
                        throw error;
                    }
                    completed.add(step.id);
                }
                finally {
                    executing.delete(step.id);
                }
            }));
        }
    }
    async executeStep(execution, step, definition) {
        const stepExecution = execution.steps.find((s) => s.stepId === step.id);
        if (!stepExecution) {
            throw new Error('Step execution not found: ' + step.id);
        }
        index_js_1.logger.getLogger().info('Executing pipeline step', {
            executionId: execution.id,
            stepId: step.id,
            stepType: step.type,
        });
        stepExecution.status = 'running';
        stepExecution.startTime = new Date();
        try {
            // Execute based on step type
            let result;
            switch (step.type) {
                case 'task':
                    result = await this.executeTask(step, execution.context);
                    break;
                case 'parallel':
                    result = await this.executeParallel(step, execution, definition);
                    break;
                case 'sequential':
                    result = await this.executeSequential(step, execution, definition);
                    break;
                case 'conditional':
                    result = await this.executeConditional(step, execution, definition);
                    break;
                case 'loop':
                    result = await this.executeLoop(step, execution, definition);
                    break;
                default:
                    throw new Error('Unknown step type: ' + step.type);
            }
            stepExecution.status = 'completed';
            stepExecution.endTime = new Date();
            stepExecution.result = result;
            index_js_1.logger.getLogger().info('Step execution completed', {
                executionId: execution.id,
                stepId: step.id,
                durationMs: stepExecution.endTime.getTime() - stepExecution.startTime.getTime(),
            });
        }
        catch (error) {
            stepExecution.status = 'failed';
            stepExecution.endTime = new Date();
            stepExecution.error = {
                code: 'STEP_EXECUTION_ERROR',
                message: error.message,
                stack: error.stack,
                recoverable: this.isRecoverableError(error, step),
            };
            index_js_1.logger.getLogger().error('Step execution failed', error, {
                executionId: execution.id,
                stepId: step.id,
            });
            throw error;
        }
    }
    async executeTask(step, context) {
        // Simulate task execution
        // In real implementation, this would call the actual task handler
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
            operation: step.config.operation,
            parameters: step.config.parameters,
            context,
            timestamp: new Date(),
        };
    }
    async executeParallel(step, execution, definition) {
        // Execute child steps in parallel
        const childSteps = this.getChildSteps(step, definition);
        const results = await Promise.all(childSteps.map((childStep) => this.executeStep(execution, childStep, definition)));
        return results;
    }
    async executeSequential(step, execution, definition) {
        // Execute child steps sequentially
        const childSteps = this.getChildSteps(step, definition);
        const results = [];
        for (const childStep of childSteps) {
            const result = await this.executeStep(execution, childStep, definition);
            results.push(result);
        }
        return results;
    }
    async executeConditional(step, execution, definition) {
        // Evaluate condition
        const condition = step.config.condition;
        if (!condition) {
            throw new Error('Conditional step requires a condition');
        }
        const shouldExecute = this.evaluateCondition(condition, execution.context);
        if (shouldExecute) {
            const childSteps = this.getChildSteps(step, definition);
            return await this.executeTask(childSteps[0], execution.context);
        }
        return null;
    }
    async executeLoop(step, execution, definition) {
        const loopConfig = step.config.loopConfig;
        if (!loopConfig) {
            throw new Error('Loop step requires loop configuration');
        }
        const results = [];
        const childSteps = this.getChildSteps(step, definition);
        for (let i = 0; i < loopConfig.maxIterations; i++) {
            // Check break condition
            if (loopConfig.breakCondition) {
                const shouldBreak = this.evaluateCondition(loopConfig.breakCondition, execution.context);
                if (shouldBreak) {
                    break;
                }
            }
            const result = await this.executeTask(childSteps[0], execution.context);
            results.push(result);
        }
        return results;
    }
    async handleStepError(execution, step, error) {
        const strategy = step.config.errorStrategy || 'fail-fast';
        const stepExecution = execution.steps.find((s) => s.stepId === step.id);
        if (!stepExecution) {
            return false;
        }
        switch (strategy) {
            case 'fail-fast':
                return false;
            case 'continue':
                index_js_1.logger.getLogger().warn('Continuing after step error', {
                    executionId: execution.id,
                    stepId: step.id,
                    error: error.message,
                });
                return true;
            case 'retry':
                if (step.retryConfig && stepExecution.attempts < step.retryConfig.maxAttempts) {
                    const backoff = this.calculateBackoff(stepExecution.attempts, step.retryConfig);
                    index_js_1.logger.getLogger().info('Retrying step execution', {
                        executionId: execution.id,
                        stepId: step.id,
                        attempt: stepExecution.attempts + 1,
                        backoffMs: backoff,
                    });
                    await new Promise((resolve) => setTimeout(resolve, backoff));
                    stepExecution.attempts++;
                    try {
                        await this.executeStep(execution, step, {});
                        return true;
                    }
                    catch (retryError) {
                        return this.handleStepError(execution, step, retryError);
                    }
                }
                return false;
            case 'fallback':
                // Execute fallback logic
                index_js_1.logger.getLogger().warn('Executing fallback for failed step', {
                    executionId: execution.id,
                    stepId: step.id,
                });
                return true;
            default:
                return false;
        }
    }
    calculateBackoff(attempts, config) {
        const backoff = config.backoffMs * Math.pow(config.backoffMultiplier, attempts);
        return Math.min(backoff, config.maxBackoffMs);
    }
    isRecoverableError(error, step) {
        if (!step.retryConfig?.retryableErrors) {
            return false;
        }
        return step.retryConfig.retryableErrors.some((pattern) => error.message.includes(pattern));
    }
    buildDependencyGraph(steps) {
        const graph = new Map();
        for (const step of steps) {
            if (!graph.has(step.id)) {
                graph.set(step.id, new Set());
            }
            for (const dep of step.dependencies) {
                graph.get(step.id).add(dep);
            }
        }
        return graph;
    }
    findReadySteps(steps, graph, completed, executing) {
        return steps.filter((step) => {
            // Skip if already completed or executing
            if (completed.has(step.id) || executing.has(step.id)) {
                return false;
            }
            // Check if all dependencies are completed
            const deps = graph.get(step.id) || new Set();
            return Array.from(deps).every((dep) => completed.has(dep));
        });
    }
    getChildSteps(step, definition) {
        // In a real implementation, this would return actual child steps
        // For now, return empty array
        return [];
    }
    evaluateCondition(condition, context) {
        // Simple condition evaluation
        // In a real implementation, use a proper expression evaluator
        try {
            const func = new Function('context', 'return ' + condition);
            return func(context);
        }
        catch (error) {
            index_js_1.logger.getLogger().error('Failed to evaluate condition', error, {
                condition,
            });
            return false;
        }
    }
    generateExecutionId() {
        return 'exec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    async getExecution(executionId) {
        return this.executions.get(executionId) || null;
    }
    async listExecutions() {
        return Array.from(this.executions.values());
    }
    async cancelExecution(executionId) {
        const execution = this.executions.get(executionId);
        if (!execution) {
            return false;
        }
        execution.status = 'cancelled';
        execution.endTime = new Date();
        index_js_1.logger.getLogger().info('Pipeline execution cancelled', {
            executionId,
        });
        return true;
    }
}
exports.PipelineEngine = PipelineEngine;
// Singleton instance
exports.pipelineEngine = new PipelineEngine();
