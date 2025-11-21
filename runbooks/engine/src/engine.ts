/**
 * Runbook Engine - Main orchestration engine
 *
 * Provides APIs to:
 * - Start a runbook execution
 * - Query execution status
 * - Fetch logs
 * - Replay completed runs
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RunbookDefinition,
  RunbookExecution,
  ExecutionStatus,
  ExecutionContext,
  StepExecutor,
  EngineConfig,
  LogQuery,
  RunbookLogEntry,
  Evidence,
  StepResult,
} from './types';
import { DAGExecutor } from './dag-executor';
import { StateManager, MemoryStorage } from './state-manager';

/**
 * Main Runbook Engine
 */
export class RunbookEngine {
  private config: EngineConfig;
  private dagExecutor: DAGExecutor;
  private stateManager: StateManager;
  private runbooks: Map<string, RunbookDefinition> = new Map();
  private executors: Map<string, StepExecutor> = new Map();

  constructor(config: EngineConfig) {
    this.config = config;

    // Initialize state manager
    const storage = new MemoryStorage(); // TODO: Support other backends
    this.stateManager = new StateManager(storage);

    // Initialize DAG executor (will be updated when executors are registered)
    this.dagExecutor = new DAGExecutor(
      this.executors,
      config.maxConcurrentSteps
    );
  }

  /**
   * Register a step executor
   */
  registerExecutor(executor: StepExecutor): void {
    this.executors.set(executor.type, executor);
    console.log(`Registered executor for step type: ${executor.type}`);
  }

  /**
   * Register a runbook definition
   */
  registerRunbook(runbook: RunbookDefinition): void {
    // Validate runbook structure
    this.dagExecutor.validateDAG(runbook.steps);

    // Validate all step executors are registered
    for (const step of runbook.steps) {
      if (!this.executors.has(step.type)) {
        throw new Error(
          `Cannot register runbook ${runbook.id}: No executor registered for step type ${step.type}`
        );
      }

      // Validate step configuration
      const executor = this.executors.get(step.type)!;
      executor.validate(step);
    }

    this.runbooks.set(runbook.id, runbook);
    console.log(
      `Registered runbook: ${runbook.id} v${runbook.version} (${runbook.steps.length} steps)`
    );
  }

  /**
   * Start a runbook execution
   */
  async startRunbook(
    runbookId: string,
    context: ExecutionContext,
    input: Record<string, any> = {},
    options?: {
      skipIdempotencyCheck?: boolean;
    }
  ): Promise<string> {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) {
      throw new Error(`Runbook not found: ${runbookId}`);
    }

    // Check for duplicate execution (idempotency)
    if (!options?.skipIdempotencyCheck) {
      const duplicate = await this.stateManager.findDuplicateExecution(
        runbookId,
        input
      );
      if (duplicate && duplicate.status === ExecutionStatus.COMPLETED) {
        console.log(
          `Found duplicate completed execution: ${duplicate.id}, returning existing result`
        );
        return duplicate.id;
      }
    }

    // Create execution
    const executionId = uuidv4();
    const execution: RunbookExecution = {
      id: executionId,
      runbookId: runbook.id,
      runbookVersion: runbook.version,
      status: ExecutionStatus.PENDING,
      context,
      input,
      stepResults: new Map(),
      startTime: new Date(),
      logs: [],
      evidence: [],
      isReplay: false,
    };

    // Save initial state
    await this.stateManager.saveExecution(execution);

    // Execute asynchronously
    this.executeRunbook(executionId, runbook, context, input).catch((error) => {
      console.error(`Runbook execution ${executionId} failed:`, error);
    });

    return executionId;
  }

  /**
   * Execute a runbook (internal)
   */
  private async executeRunbook(
    executionId: string,
    runbook: RunbookDefinition,
    context: ExecutionContext,
    input: Record<string, any>
  ): Promise<void> {
    const execution = await this.stateManager.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    try {
      // Update status to running
      execution.status = ExecutionStatus.RUNNING;
      execution.logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'info',
        stepId: 'engine',
        executionId,
        message: `Starting runbook: ${runbook.name} v${runbook.version}`,
        metadata: {
          runbookId: runbook.id,
          context: {
            tenantId: context.tenantId,
            initiatedBy: context.initiatedBy,
            legalBasis: context.legalBasis.authority,
          },
        },
        assumptions: context.assumptions,
      });
      await this.stateManager.saveExecution(execution);

      // Execute DAG
      const stepResults = await this.dagExecutor.executeDAG(
        runbook.steps,
        context,
        executionId,
        input
      );

      // Collect all logs and evidence
      const allLogs: RunbookLogEntry[] = [...execution.logs];
      const allEvidence: Evidence[] = [];

      for (const result of stepResults.values()) {
        allLogs.push(...result.logs);
        allEvidence.push(...result.evidence);
      }

      // Determine final output (from last step or specific output step)
      let finalOutput: Record<string, any> | undefined;
      const outputSteps = runbook.steps.filter((s) => s.id.includes('output') || s.id.includes('report'));
      if (outputSteps.length > 0) {
        const lastOutputStep = outputSteps[outputSteps.length - 1];
        const result = stepResults.get(lastOutputStep.id);
        finalOutput = result?.output?.data;
      } else {
        // Use last step
        const lastStep = runbook.steps[runbook.steps.length - 1];
        const result = stepResults.get(lastStep.id);
        finalOutput = result?.output?.data;
      }

      // Update execution with results
      execution.status = ExecutionStatus.COMPLETED;
      execution.endTime = new Date();
      execution.durationMs = execution.endTime.getTime() - execution.startTime.getTime();
      execution.stepResults = stepResults;
      execution.output = finalOutput;
      execution.logs = allLogs;
      execution.evidence = allEvidence;

      execution.logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'info',
        stepId: 'engine',
        executionId,
        message: `Runbook completed successfully`,
        metadata: {
          durationMs: execution.durationMs,
          stepsCompleted: stepResults.size,
          evidenceCollected: allEvidence.length,
        },
      });

      await this.stateManager.saveExecution(execution);
    } catch (error) {
      // Handle failure
      execution.status = ExecutionStatus.FAILED;
      execution.endTime = new Date();
      execution.durationMs = execution.endTime.getTime() - execution.startTime.getTime();
      execution.error = error as Error;

      execution.logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'error',
        stepId: 'engine',
        executionId,
        message: `Runbook failed: ${(error as Error).message}`,
        metadata: {
          error: (error as Error).stack,
        },
      });

      await this.stateManager.saveExecution(execution);
    }
  }

  /**
   * Get execution status
   */
  async getStatus(executionId: string): Promise<RunbookExecution | null> {
    return this.stateManager.getExecution(executionId);
  }

  /**
   * Get execution logs
   */
  async getLogs(query: LogQuery): Promise<RunbookLogEntry[]> {
    return this.stateManager.queryLogs(query);
  }

  /**
   * Get execution evidence
   */
  async getEvidence(executionId: string): Promise<Evidence[]> {
    return this.stateManager.getExecutionEvidence(executionId);
  }

  /**
   * Replay a completed execution
   *
   * This creates a new execution that re-runs the same runbook with the same inputs,
   * allowing for debugging or verification.
   */
  async replayExecution(
    originalExecutionId: string,
    context?: ExecutionContext
  ): Promise<string> {
    const original = await this.stateManager.getExecution(originalExecutionId);
    if (!original) {
      throw new Error(`Original execution not found: ${originalExecutionId}`);
    }

    const runbook = this.runbooks.get(original.runbookId);
    if (!runbook) {
      throw new Error(`Runbook not found: ${original.runbookId}`);
    }

    // Create new execution with same inputs but marked as replay
    const executionId = uuidv4();
    const execution: RunbookExecution = {
      id: executionId,
      runbookId: original.runbookId,
      runbookVersion: runbook.version, // Use current version
      status: ExecutionStatus.PENDING,
      context: context || original.context, // Allow override
      input: original.input,
      stepResults: new Map(),
      startTime: new Date(),
      logs: [],
      evidence: [],
      isReplay: true,
      originalExecutionId: originalExecutionId,
    };

    execution.logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info',
      stepId: 'engine',
      executionId,
      message: `Replaying execution: ${originalExecutionId}`,
      metadata: {
        originalExecutionId,
      },
    });

    await this.stateManager.saveExecution(execution);

    // Execute asynchronously
    this.executeRunbook(
      executionId,
      runbook,
      execution.context,
      original.input
    ).catch((error) => {
      console.error(`Replay execution ${executionId} failed:`, error);
    });

    return executionId;
  }

  /**
   * Get all executions for a runbook
   */
  async getExecutions(runbookId: string): Promise<RunbookExecution[]> {
    return this.stateManager.getExecutionsByRunbook(runbookId);
  }

  /**
   * Get registered runbooks
   */
  getRunbooks(): RunbookDefinition[] {
    return Array.from(this.runbooks.values());
  }

  /**
   * Get a specific runbook definition
   */
  getRunbook(runbookId: string): RunbookDefinition | undefined {
    return this.runbooks.get(runbookId);
  }
}
