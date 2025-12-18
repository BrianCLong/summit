/**
 * Agentic Mesh SDK - Base Agent Implementation
 *
 * This module provides the abstract BaseAgent class that all mesh agents extend.
 * It handles lifecycle management, task execution, and integration with mesh services.
 */

import type {
  AgentDescriptor,
  AgentRole,
  AgentStatus,
  AgentLifecycleEvent,
  TaskInput,
  TaskOutput,
  TaskError,
  ProvenanceRecord,
  ToolDescriptor,
  ModelPreference,
  RiskTier,
  UUID,
  Timestamp,
  SubtaskResult,
} from './types.js';

// ============================================================================
// AGENT CONTEXT & DEPENDENCIES
// ============================================================================

/**
 * Services available to agents during execution.
 */
export interface AgentServices {
  /** Log provenance records */
  provenance: ProvenanceClient;
  /** Invoke tools */
  tools: ToolClient;
  /** Make model calls */
  model: ModelClient;
  /** Spawn subtasks to other agents */
  mesh: MeshClient;
  /** Emit metrics */
  metrics: MetricsClient;
  /** Structured logging */
  logger: Logger;
}

export interface ProvenanceClient {
  record(event: Omit<ProvenanceRecord, 'id' | 'timestamp' | 'payloadHash'>): Promise<UUID>;
  query(taskId: UUID): Promise<ProvenanceRecord[]>;
}

export interface ToolClient {
  invoke<TIn, TOut>(toolName: string, input: TIn): Promise<TOut>;
  list(): Promise<ToolDescriptor[]>;
  get(toolName: string): Promise<ToolDescriptor | null>;
}

export interface ModelClient {
  complete(prompt: string, options?: ModelCallOptions): Promise<ModelResponse>;
  chat(messages: ChatMessage[], options?: ModelCallOptions): Promise<ModelResponse>;
}

export interface ModelCallOptions {
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ModelResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  model: string;
  provider: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MeshClient {
  spawnSubtask<T>(taskType: string, input: T, options?: SubtaskOptions): Promise<UUID>;
  awaitSubtask<T>(subtaskId: UUID, timeoutMs?: number): Promise<TaskOutput<T>>;
  requestAgent(role: AgentRole, capabilities?: string[]): Promise<AgentDescriptor | null>;
}

export interface SubtaskOptions {
  priority?: number;
  targetAgent?: UUID;
  timeoutMs?: number;
}

export interface MetricsClient {
  increment(name: string, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, durationMs: number, tags?: Record<string, string>): void;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

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
export abstract class BaseAgent {
  protected id: UUID;
  protected status: AgentStatus = 'active';
  protected registeredAt?: Timestamp;

  constructor(id?: UUID) {
    this.id = id ?? crypto.randomUUID();
  }

  // ---------------------------------------------------------------------------
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ---------------------------------------------------------------------------

  /**
   * Returns the static descriptor for this agent.
   * Called during registration and for capability discovery.
   */
  abstract getDescriptor(): Omit<AgentDescriptor, 'id' | 'status' | 'registeredAt' | 'lastHeartbeat'>;

  /**
   * Main entry point for task execution.
   * Called when the mesh assigns a task to this agent.
   *
   * @param input - The task input including payload and execution context
   * @param services - Mesh services available for task execution
   * @returns Task output with results or error
   */
  abstract onTaskReceived<TIn, TOut>(
    input: TaskInput<TIn>,
    services: AgentServices
  ): Promise<TaskOutput<TOut>>;

  // ---------------------------------------------------------------------------
  // LIFECYCLE HOOKS (optional, override as needed)
  // ---------------------------------------------------------------------------

  /**
   * Called when the agent is registered with the mesh.
   * Use for initialization, resource allocation, etc.
   */
  async onRegister(services: AgentServices): Promise<void> {
    services.logger.info(`Agent registered: ${this.getDescriptor().name}`, { agentId: this.id });
  }

  /**
   * Called when a spawned subtask completes.
   * Override to handle subtask results.
   */
  async onSubtaskResult<T>(
    subtaskId: UUID,
    result: TaskOutput<T>,
    services: AgentServices
  ): Promise<void> {
    services.logger.debug(`Subtask completed: ${subtaskId}`, { status: result.status });
  }

  /**
   * Called when an error occurs during task execution.
   * Override for custom error handling, retry logic, or escalation.
   *
   * @returns true if error was handled and execution should continue
   */
  async onError(
    error: TaskError,
    input: TaskInput,
    services: AgentServices
  ): Promise<boolean> {
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
  async onRetire(services: AgentServices): Promise<void> {
    services.logger.info(`Agent retiring: ${this.getDescriptor().name}`, { agentId: this.id });
    this.status = 'retired';
  }

  // ---------------------------------------------------------------------------
  // PUBLIC METHODS
  // ---------------------------------------------------------------------------

  /**
   * Returns the full agent descriptor including runtime state.
   */
  getFullDescriptor(): AgentDescriptor {
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
  getId(): UUID {
    return this.id;
  }

  /**
   * Returns the agent's current status.
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Sets the agent's status (used by mesh orchestrator).
   */
  setStatus(status: AgentStatus): void {
    this.status = status;
  }

  /**
   * Health check - override for custom health logic.
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    return { healthy: this.status === 'active' || this.status === 'busy' };
  }

  // ---------------------------------------------------------------------------
  // PROTECTED HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Helper to create a successful task output.
   */
  protected success<T>(taskId: UUID, result: T, metadata?: Partial<TaskOutput['metadata']>): TaskOutput<T> {
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
  protected failure(taskId: UUID, error: TaskError, metadata?: Partial<TaskOutput['metadata']>): TaskOutput {
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
  protected needsReview<T>(taskId: UUID, result: T, reason: string): TaskOutput<T> {
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
  protected async recordProvenance(
    services: AgentServices,
    taskId: UUID,
    type: ProvenanceRecord['type'],
    payload: ProvenanceRecord['payload'],
    traceContext: ProvenanceRecord['traceContext']
  ): Promise<UUID> {
    return services.provenance.record({
      type,
      taskId,
      agentId: this.id,
      payload,
      traceContext,
    });
  }
}

// ============================================================================
// AGENT FACTORY
// ============================================================================

/**
 * Factory for creating and managing agent instances.
 */
export class AgentFactory {
  private static registry = new Map<string, new (id?: UUID) => BaseAgent>();

  /**
   * Register an agent class with the factory.
   */
  static register(name: string, agentClass: new (id?: UUID) => BaseAgent): void {
    this.registry.set(name, agentClass);
  }

  /**
   * Create an agent instance by name.
   */
  static create(name: string, id?: UUID): BaseAgent {
    const AgentClass = this.registry.get(name);
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${name}`);
    }
    return new AgentClass(id);
  }

  /**
   * List all registered agent types.
   */
  static listTypes(): string[] {
    return Array.from(this.registry.keys());
  }
}
