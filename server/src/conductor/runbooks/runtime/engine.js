"use strict";
/**
 * Runbook Runtime Engine
 *
 * DAG-based execution engine with:
 * - Topological sorting for dependency resolution
 * - Parallel execution where possible
 * - Pause/Resume/Cancel capabilities
 * - Retry with exponential backoff
 * - Comprehensive audit logging
 *
 * @module runbooks/runtime/engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryRunbookDefinitionRepository = exports.RunbookRuntimeEngine = exports.DefaultStepExecutorRegistry = void 0;
const types_js_1 = require("./types.js");
// ============================================================================
// Step Executor Registry Implementation
// ============================================================================
/**
 * Default step executor registry
 */
class DefaultStepExecutorRegistry {
    executors = new Map();
    register(executor) {
        this.executors.set(executor.actionType, executor);
    }
    getExecutor(actionType) {
        return this.executors.get(actionType);
    }
    hasExecutor(actionType) {
        return this.executors.has(actionType);
    }
}
exports.DefaultStepExecutorRegistry = DefaultStepExecutorRegistry;
/**
 * Main runtime engine for executing runbooks
 */
class RunbookRuntimeEngine {
    definitionRepo;
    stateManager;
    executorRegistry;
    config;
    runningExecutions = new Map();
    constructor(definitionRepo, stateManager, executorRegistry, config = {}) {
        this.definitionRepo = definitionRepo;
        this.stateManager = stateManager;
        this.executorRegistry = executorRegistry;
        this.config = {
            defaultTimeoutMs: config.defaultTimeoutMs ?? 300000, // 5 minutes
            maxParallelSteps: config.maxParallelSteps ?? 10,
            pollIntervalMs: config.pollIntervalMs ?? 100,
        };
    }
    /**
     * Start a new runbook execution
     */
    async startExecution(runbookId, input, options) {
        // Get runbook definition
        const definition = await this.definitionRepo.getById(runbookId);
        if (!definition) {
            throw new Error(`Runbook ${runbookId} not found`);
        }
        // Validate DAG
        this.validateDAG(definition.steps);
        // Check legal basis requirements
        if (definition.legalBasisRequired && definition.legalBasisRequired.length > 0) {
            if (!options.legalBasis) {
                throw new Error(`Legal basis required: ${definition.legalBasisRequired.join(', ')}`);
            }
            if (!definition.legalBasisRequired.includes(options.legalBasis)) {
                throw new Error(`Legal basis ${options.legalBasis} not acceptable. Required: ${definition.legalBasisRequired.join(', ')}`);
            }
        }
        // Create execution state
        const execution = (0, types_js_1.createInitialExecution)(definition, input, options);
        // Persist initial state
        await this.stateManager.createExecution(execution, options.startedBy);
        // Start async execution
        this.executeAsync(execution.executionId, definition, options.startedBy);
        return execution;
    }
    /**
     * Get execution state
     */
    async getExecution(executionId) {
        return this.stateManager.getExecutionOrThrow(executionId).catch(() => null);
    }
    /**
     * Control execution (PAUSE/RESUME/CANCEL)
     */
    async controlExecution(executionId, action, actorId) {
        switch (action) {
            case 'PAUSE':
                return this.pauseExecution(executionId, actorId);
            case 'RESUME':
                return this.resumeExecution(executionId, actorId);
            case 'CANCEL':
                return this.cancelExecution(executionId, actorId);
            default:
                throw new Error(`Unknown control action: ${action}`);
        }
    }
    /**
     * Get execution logs
     */
    async getExecutionLogs(executionId) {
        // Access the log repository through state manager
        const execution = await this.stateManager.getExecutionOrThrow(executionId);
        // This would need the log repo exposed - simplified for now
        return [];
    }
    // ============================================================================
    // Private: Execution Control
    // ============================================================================
    /**
     * Pause a running execution
     */
    async pauseExecution(executionId, actorId) {
        // Signal abort to running steps
        const controller = this.runningExecutions.get(executionId);
        if (controller) {
            // Don't abort - just pause state
        }
        return this.stateManager.pauseExecution(executionId, actorId);
    }
    /**
     * Resume a paused execution
     */
    async resumeExecution(executionId, actorId) {
        const execution = await this.stateManager.resumeExecution(executionId, actorId);
        // Get definition and restart execution
        const definition = await this.definitionRepo.getById(execution.runbookId);
        if (!definition) {
            throw new Error(`Runbook ${execution.runbookId} not found`);
        }
        // Resume async execution
        this.executeAsync(executionId, definition, actorId);
        return execution;
    }
    /**
     * Cancel an execution
     */
    async cancelExecution(executionId, actorId) {
        // Signal abort to running steps
        const controller = this.runningExecutions.get(executionId);
        if (controller) {
            controller.abort();
        }
        return this.stateManager.cancelExecution(executionId, actorId);
    }
    // ============================================================================
    // Private: Async Execution
    // ============================================================================
    /**
     * Execute runbook asynchronously
     */
    async executeAsync(executionId, definition, actorId) {
        const controller = new AbortController();
        this.runningExecutions.set(executionId, controller);
        try {
            // Transition to running
            await this.stateManager.transitionToRunning(executionId, actorId);
            // Topologically sort steps
            const sortedSteps = this.topologicalSort(definition.steps);
            // Create execution batches for parallel execution
            const batches = this.createExecutionBatches(sortedSteps);
            // Execute batches
            for (const batch of batches) {
                // Check for pause/cancel
                const currentState = await this.stateManager.getExecutionOrThrow(executionId);
                if (currentState.status === 'PAUSED' || currentState.status === 'CANCELLED') {
                    return;
                }
                if (controller.signal.aborted) {
                    return;
                }
                // Execute batch in parallel
                await Promise.all(batch.map((step) => this.executeStep(executionId, definition, step, actorId, controller)));
            }
            // Check final state
            const finalState = await this.stateManager.getExecutionOrThrow(executionId);
            // Determine if completed or failed
            const hasFailures = finalState.steps.some((s) => s.status === 'FAILED' && !definition.steps.find((d) => d.id === s.stepId)?.skipOnFailure);
            if (hasFailures) {
                await this.stateManager.failExecution(executionId, actorId, 'One or more steps failed');
            }
            else if (finalState.status === 'RUNNING') {
                await this.stateManager.completeExecution(executionId, actorId);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            try {
                await this.stateManager.failExecution(executionId, actorId, errorMessage);
            }
            catch {
                // Log but don't throw
                console.error(`Failed to mark execution ${executionId} as failed:`, error);
            }
        }
        finally {
            this.runningExecutions.delete(executionId);
        }
    }
    /**
     * Execute a single step with retry
     */
    async executeStep(executionId, definition, stepDef, actorId, controller) {
        // Get executor
        const executor = this.executorRegistry.getExecutor(stepDef.actionType);
        if (!executor) {
            // Skip with error if no executor
            await this.stateManager.skipStep(executionId, stepDef.id, actorId, `No executor for action type: ${stepDef.actionType}`);
            return;
        }
        const retryPolicy = stepDef.retryPolicy || { maxAttempts: 1, backoffSeconds: 1 };
        const timeoutMs = stepDef.timeoutMs || this.config.defaultTimeoutMs;
        let lastError;
        for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
            // Check for abort
            if (controller.signal.aborted) {
                return;
            }
            // Check execution state
            const currentState = await this.stateManager.getExecutionOrThrow(executionId);
            if (currentState.status !== 'RUNNING') {
                return;
            }
            try {
                // Mark step started
                await this.stateManager.startStep(executionId, stepDef.id, actorId);
                // Build context
                const context = await this.buildStepContext(executionId, definition, stepDef);
                // Execute with timeout
                const result = await this.executeWithTimeout(executor.execute(context), timeoutMs, stepDef.id);
                if (result.success) {
                    // Mark step succeeded
                    await this.stateManager.succeedStep(executionId, stepDef.id, actorId, result.output, result.evidence, result.citations, result.proofs, result.kpis);
                    return;
                }
                else {
                    throw new Error(result.errorMessage || 'Step failed without error message');
                }
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Check if we should retry
                if (attempt < retryPolicy.maxAttempts) {
                    const backoffMs = this.calculateBackoff(attempt, retryPolicy.backoffSeconds * 1000, retryPolicy.backoffMultiplier, retryPolicy.maxBackoffSeconds ? retryPolicy.maxBackoffSeconds * 1000 : undefined);
                    // Wait before retry
                    await this.delay(backoffMs);
                }
            }
        }
        // All retries exhausted
        if (stepDef.skipOnFailure) {
            await this.stateManager.skipStep(executionId, stepDef.id, actorId, `Failed after ${retryPolicy.maxAttempts} attempts: ${lastError?.message}`);
        }
        else {
            await this.stateManager.failStep(executionId, stepDef.id, actorId, lastError?.message || 'Unknown error');
        }
    }
    /**
     * Build step execution context
     */
    async buildStepContext(executionId, definition, stepDef) {
        const execution = await this.stateManager.getExecutionOrThrow(executionId);
        // Gather outputs from previous steps
        const previousStepOutputs = {};
        for (const step of execution.steps) {
            if (step.output) {
                previousStepOutputs[step.stepId] = step.output;
            }
        }
        return {
            executionId,
            runbookId: definition.id,
            tenantId: execution.tenantId,
            userId: execution.startedBy,
            step: stepDef,
            input: execution.input,
            previousStepOutputs,
            legalBasis: execution.legalBasis,
            dataLicenses: execution.dataLicenses,
            authorityIds: execution.authorityIds,
        };
    }
    /**
     * Execute with timeout
     */
    async executeWithTimeout(promise, timeoutMs, stepId) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`Step ${stepId} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        return Promise.race([
            promise.finally(() => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            }),
            timeoutPromise,
        ]);
    }
    /**
     * Calculate exponential backoff
     */
    calculateBackoff(attempt, baseMs, multiplier = 2, maxMs) {
        const backoff = baseMs * Math.pow(multiplier, attempt - 1);
        return maxMs ? Math.min(backoff, maxMs) : backoff;
    }
    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // ============================================================================
    // Private: DAG Operations
    // ============================================================================
    /**
     * Validate DAG for cycles
     */
    validateDAG(steps) {
        const stepMap = new Map(steps.map((s) => [s.id, s]));
        const visited = new Set();
        const visiting = new Set();
        const visit = (stepId, path) => {
            if (visiting.has(stepId)) {
                throw new Error(`Circular dependency detected: ${[...path, stepId].join(' -> ')}`);
            }
            if (visited.has(stepId)) {
                return;
            }
            visiting.add(stepId);
            const step = stepMap.get(stepId);
            if (step && step.dependsOn) {
                for (const depId of step.dependsOn) {
                    if (!stepMap.has(depId)) {
                        throw new Error(`Step ${stepId} depends on unknown step ${depId}`);
                    }
                    visit(depId, [...path, stepId]);
                }
            }
            visiting.delete(stepId);
            visited.add(stepId);
        };
        for (const step of steps) {
            visit(step.id, []);
        }
    }
    /**
     * Topological sort of steps
     */
    topologicalSort(steps) {
        const sorted = [];
        const visited = new Set();
        const stepMap = new Map(steps.map((s) => [s.id, s]));
        const visit = (stepId) => {
            if (visited.has(stepId))
                return;
            const step = stepMap.get(stepId);
            if (!step)
                return;
            // Visit dependencies first
            for (const depId of step.dependsOn || []) {
                visit(depId);
            }
            visited.add(stepId);
            sorted.push(step);
        };
        for (const step of steps) {
            visit(step.id);
        }
        return sorted;
    }
    /**
     * Create execution batches for parallel execution
     */
    createExecutionBatches(sortedSteps) {
        const batches = [];
        const completed = new Set();
        while (completed.size < sortedSteps.length) {
            const batch = [];
            for (const step of sortedSteps) {
                if (completed.has(step.id))
                    continue;
                // Check if all dependencies are completed
                const dependenciesMet = (step.dependsOn || []).every((depId) => completed.has(depId));
                if (dependenciesMet && batch.length < this.config.maxParallelSteps) {
                    batch.push(step);
                }
            }
            if (batch.length === 0) {
                throw new Error('Unable to schedule steps - check for circular dependencies');
            }
            batches.push(batch);
            batch.forEach((step) => completed.add(step.id));
        }
        return batches;
    }
}
exports.RunbookRuntimeEngine = RunbookRuntimeEngine;
// ============================================================================
// In-Memory Definition Repository (for testing/development)
// ============================================================================
/**
 * In-memory runbook definition repository
 */
class InMemoryRunbookDefinitionRepository {
    definitions = new Map();
    async getById(id, version) {
        // Find by ID, optionally filtering by version
        for (const def of this.definitions.values()) {
            if (def.id === id && (!version || def.version === version)) {
                return { ...def };
            }
        }
        return null;
    }
    async list() {
        return Array.from(this.definitions.values()).map((d) => ({ ...d }));
    }
    async listByIds(ids) {
        return Array.from(this.definitions.values())
            .filter((d) => ids.includes(d.id))
            .map((d) => ({ ...d }));
    }
    async save(definition) {
        const key = `${definition.id}:${definition.version}`;
        this.definitions.set(key, { ...definition });
    }
    async delete(id, version) {
        if (version) {
            this.definitions.delete(`${id}:${version}`);
        }
        else {
            for (const key of this.definitions.keys()) {
                if (key.startsWith(`${id}:`)) {
                    this.definitions.delete(key);
                }
            }
        }
    }
    register(definition) {
        const key = `${definition.id}:${definition.version}`;
        this.definitions.set(key, { ...definition });
    }
    clear() {
        this.definitions.clear();
    }
}
exports.InMemoryRunbookDefinitionRepository = InMemoryRunbookDefinitionRepository;
