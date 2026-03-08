"use strict";
/**
 * Agentic Mesh SDK - Base Agent Implementation
 *
 * This module provides the abstract BaseAgent class that all mesh agents extend.
 * It handles lifecycle management, task execution, and integration with mesh services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentFactory = exports.BaseAgent = void 0;
// ============================================================================
// BASE AGENT
// ============================================================================
/**
 * Abstract base class for all Agentic Mesh agents.
 *
 * Subclasses must implement:
 * - getDescriptor(): Returns static metadata about the agent
 * - onTaskReceived(): Main entry point for task execution
 *
 * Optional lifecycle hooks:
 * - onRegister(): Called when agent joins the mesh
 * - onSubtaskResult(): Called when a spawned subtask completes
 * - onError(): Called on errors for custom recovery logic
 * - onRetire(): Called when agent is being retired
 *
 * @example
 * ```typescript
 * class MyCoderAgent extends BaseAgent {
 *   getDescriptor() {
 *     return {
 *       name: 'my-coder',
 *       version: '1.0.0',
 *       role: 'coder',
 *       // ...
 *     };
 *   }
 *
 *   async onTaskReceived(input, services) {
 *     const response = await services.model.complete(input.payload.prompt);
 *     return { taskId: input.task.id, status: 'completed', result: response };
 *   }
 * }
 * ```
 */
class BaseAgent {
    id;
    status = 'active';
    registeredAt;
    constructor(id) {
        this.id = id ?? crypto.randomUUID();
    }
    // ---------------------------------------------------------------------------
    // LIFECYCLE HOOKS (optional, override as needed)
    // ---------------------------------------------------------------------------
    /**
     * Called when the agent is registered with the mesh.
     * Use for initialization, resource allocation, etc.
     */
    async onRegister(services) {
        services.logger.info(`Agent registered: ${this.getDescriptor().name}`, { agentId: this.id });
    }
    /**
     * Called when a spawned subtask completes.
     * Override to handle subtask results.
     */
    async onSubtaskResult(subtaskId, result, services) {
        services.logger.debug(`Subtask completed: ${subtaskId}`, { status: result.status });
    }
    /**
     * Called when an error occurs during task execution.
     * Override for custom error handling, retry logic, or escalation.
     *
     * @returns true if error was handled and execution should continue
     */
    async onError(error, input, services) {
        services.logger.error(`Agent error: ${error.message}`, {
            agentId: this.id,
            taskId: input.task.id,
            errorCode: error.code,
            recoverable: error.recoverable,
        });
        return false; // Default: don't continue
    }
    /**
     * Called when the agent is being retired from the mesh.
     * Use for cleanup, resource deallocation, etc.
     */
    async onRetire(services) {
        services.logger.info(`Agent retiring: ${this.getDescriptor().name}`, { agentId: this.id });
        this.status = 'retired';
    }
    // ---------------------------------------------------------------------------
    // PUBLIC METHODS
    // ---------------------------------------------------------------------------
    /**
     * Returns the full agent descriptor including runtime state.
     */
    getFullDescriptor() {
        const base = this.getDescriptor();
        return {
            ...base,
            id: this.id,
            status: this.status,
            registeredAt: this.registeredAt ?? new Date().toISOString(),
            lastHeartbeat: new Date().toISOString(),
        };
    }
    /**
     * Returns the agent's unique identifier.
     */
    getId() {
        return this.id;
    }
    /**
     * Returns the agent's current status.
     */
    getStatus() {
        return this.status;
    }
    /**
     * Sets the agent's status (used by mesh orchestrator).
     */
    setStatus(status) {
        this.status = status;
    }
    /**
     * Health check - override for custom health logic.
     */
    async healthCheck() {
        return { healthy: this.status === 'active' || this.status === 'busy' };
    }
    // ---------------------------------------------------------------------------
    // PROTECTED HELPERS
    // ---------------------------------------------------------------------------
    /**
     * Helper to create a successful task output.
     */
    success(taskId, result, metadata) {
        return {
            taskId,
            status: 'completed',
            result,
            metadata: {
                tokensUsed: 0,
                costUsd: 0,
                latencyMs: 0,
                modelCallCount: 0,
                toolCallCount: 0,
                provenanceRecordIds: [],
                ...metadata,
            },
        };
    }
    /**
     * Helper to create a failed task output.
     */
    failure(taskId, error, metadata) {
        return {
            taskId,
            status: 'failed',
            error,
            metadata: {
                tokensUsed: 0,
                costUsd: 0,
                latencyMs: 0,
                modelCallCount: 0,
                toolCallCount: 0,
                provenanceRecordIds: [],
                ...metadata,
            },
        };
    }
    /**
     * Helper to create an output that needs human review.
     */
    needsReview(taskId, result, reason) {
        return {
            taskId,
            status: 'needs_review',
            result,
            metadata: {
                tokensUsed: 0,
                costUsd: 0,
                latencyMs: 0,
                modelCallCount: 0,
                toolCallCount: 0,
                provenanceRecordIds: [],
            },
        };
    }
    /**
     * Helper to record provenance with consistent metadata.
     */
    async recordProvenance(services, taskId, type, payload, traceContext) {
        return services.provenance.record({
            type,
            taskId,
            agentId: this.id,
            payload,
            traceContext,
        });
    }
}
exports.BaseAgent = BaseAgent;
// ============================================================================
// AGENT FACTORY
// ============================================================================
/**
 * Factory for creating and managing agent instances.
 */
class AgentFactory {
    static registry = new Map();
    /**
     * Register an agent class with the factory.
     */
    static register(name, agentClass) {
        this.registry.set(name, agentClass);
    }
    /**
     * Create an agent instance by name.
     */
    static create(name, id) {
        const AgentClass = this.registry.get(name);
        if (!AgentClass) {
            throw new Error(`Unknown agent type: ${name}`);
        }
        return new AgentClass(id);
    }
    /**
     * List all registered agent types.
     */
    static listTypes() {
        return Array.from(this.registry.keys());
    }
}
exports.AgentFactory = AgentFactory;
