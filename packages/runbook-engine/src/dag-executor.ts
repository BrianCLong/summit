/**
 * DAG Executor - Core orchestration engine for runbook steps
 *
 * Handles:
 * - Topological sorting of step dependencies
 * - Parallel execution of independent steps
 * - Retry logic with exponential backoff
 * - Error propagation and circuit breaking
 */

import {
  StepDefinition,
  StepResult,
  StepExecutor,
  ExecutionStatus,
  RetryPolicy,
  ExecutionContext,
  StepIO,
  RunbookLogEntry,
  Evidence,
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents a step node in the execution DAG
 */
interface StepNode {
  step: StepDefinition;
  dependencies: Set<string>;
  dependents: Set<string>;
}

/**
 * DAG Executor - orchestrates step execution
 */
export class DAGExecutor {
  private executors: Map<string, StepExecutor>;
  private maxConcurrentSteps: number;

  constructor(
    executors: Map<string, StepExecutor>,
    maxConcurrentSteps: number = 5
  ) {
    this.executors = executors;
    this.maxConcurrentSteps = maxConcurrentSteps;
  }

  /**
   * Validate DAG structure (no cycles, valid dependencies)
   */
  validateDAG(steps: StepDefinition[]): void {
    const nodes = this.buildGraph(steps);

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodes.get(nodeId);
      if (!node) return false;

      for (const depId of node.dependencies) {
        if (!visited.has(depId)) {
          if (hasCycle(depId)) return true;
        } else if (recursionStack.has(depId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (hasCycle(nodeId)) {
          throw new Error(`Cycle detected in DAG involving step: ${nodeId}`);
        }
      }
    }

    // Validate all dependencies exist
    for (const [stepId, node] of nodes) {
      for (const depId of node.dependencies) {
        if (!nodes.has(depId)) {
          throw new Error(
            `Step ${stepId} depends on non-existent step: ${depId}`
          );
        }
      }
    }

    // Validate executors exist for all step types
    for (const step of steps) {
      if (!this.executors.has(step.type)) {
        throw new Error(
          `No executor registered for step type: ${step.type} (step: ${step.id})`
        );
      }
    }
  }

  /**
   * Build execution graph from step definitions
   */
  private buildGraph(steps: StepDefinition[]): Map<string, StepNode> {
    const nodes = new Map<string, StepNode>();

    // Create nodes
    for (const step of steps) {
      nodes.set(step.id, {
        step,
        dependencies: new Set(step.dependsOn),
        dependents: new Set(),
      });
    }

    // Build dependent relationships
    for (const [stepId, node] of nodes) {
      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.dependents.add(stepId);
        }
      }
    }

    return nodes;
  }

  /**
   * Get topologically sorted execution order
   */
  getExecutionLevels(steps: StepDefinition[]): StepDefinition[][] {
    const nodes = this.buildGraph(steps);
    const levels: StepDefinition[][] = [];
    const processed = new Set<string>();

    while (processed.size < steps.length) {
      const currentLevel: StepDefinition[] = [];

      // Find steps with all dependencies satisfied
      for (const [stepId, node] of nodes) {
        if (processed.has(stepId)) continue;

        const allDepsSatisfied = Array.from(node.dependencies).every((depId) =>
          processed.has(depId)
        );

        if (allDepsSatisfied) {
          currentLevel.push(node.step);
        }
      }

      if (currentLevel.length === 0) {
        // Should not happen if validation passed
        const remaining = Array.from(nodes.keys()).filter(
          (id) => !processed.has(id)
        );
        throw new Error(
          `Unable to resolve dependencies for steps: ${remaining.join(', ')}`
        );
      }

      levels.push(currentLevel);
      currentLevel.forEach((step) => processed.add(step.id));
    }

    return levels;
  }

  /**
   * Execute a single step with retry logic
   */
  async executeStepWithRetry(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext,
    executionId: string
  ): Promise<StepResult> {
    const executor = this.executors.get(step.type);
    if (!executor) {
      throw new Error(`No executor found for step type: ${step.type}`);
    }

    const retryPolicy = step.retryPolicy;
    let lastError: Error | undefined;
    let attemptNumber = 0;

    while (attemptNumber < retryPolicy.maxAttempts) {
      attemptNumber++;

      try {
        const startTime = new Date();
        const logs: RunbookLogEntry[] = [];

        // Log step start
        logs.push({
          id: uuidv4(),
          timestamp: new Date(),
          level: 'info',
          stepId: step.id,
          executionId,
          message: `Starting step: ${step.name} (attempt ${attemptNumber}/${retryPolicy.maxAttempts})`,
          metadata: {
            stepType: step.type,
            attemptNumber,
          },
        });

        // Execute with timeout if configured
        const executePromise = executor.execute(step, input, context);

        let result: StepResult;
        if (step.timeoutMs) {
          result = await this.executeWithTimeout(
            executePromise,
            step.timeoutMs,
            step.id
          );
        } else {
          result = await executePromise;
        }

        // Add our tracking logs to result
        result.logs = [...logs, ...result.logs];

        // Log success
        result.logs.push({
          id: uuidv4(),
          timestamp: new Date(),
          level: 'info',
          stepId: step.id,
          executionId,
          message: `Step completed successfully: ${step.name}`,
          metadata: {
            durationMs: result.durationMs,
            evidenceCount: result.evidence.length,
          },
        });

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (
          retryPolicy.retryableErrors &&
          retryPolicy.retryableErrors.length > 0
        ) {
          const isRetryable = retryPolicy.retryableErrors.some((errType) =>
            lastError?.message.includes(errType)
          );
          if (!isRetryable) {
            // Non-retryable error, fail immediately
            break;
          }
        }

        // Calculate backoff delay
        if (attemptNumber < retryPolicy.maxAttempts) {
          const delay = Math.min(
            retryPolicy.initialDelayMs *
              Math.pow(retryPolicy.backoffMultiplier, attemptNumber - 1),
            retryPolicy.maxDelayMs
          );

          console.warn(
            `Step ${step.id} failed (attempt ${attemptNumber}), retrying in ${delay}ms:`,
            lastError.message
          );

          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    const endTime = new Date();
    const failureResult: StepResult = {
      stepId: step.id,
      status: ExecutionStatus.FAILED,
      error: lastError,
      startTime: endTime, // Approximate
      endTime,
      durationMs: 0,
      attemptNumber,
      evidence: [],
      logs: [
        {
          id: uuidv4(),
          timestamp: endTime,
          level: 'error',
          stepId: step.id,
          executionId,
          message: `Step failed after ${attemptNumber} attempts: ${lastError?.message}`,
          metadata: {
            error: lastError?.stack,
          },
        },
      ],
    };

    return failureResult;
  }

  /**
   * Execute promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    stepId: string
  ): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step ${stepId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute all steps in a level concurrently
   */
  async executeLevel(
    level: StepDefinition[],
    completedResults: Map<string, StepResult>,
    context: ExecutionContext,
    executionId: string
  ): Promise<Map<string, StepResult>> {
    const levelResults = new Map<string, StepResult>();

    // Execute in batches to respect concurrency limits
    for (let i = 0; i < level.length; i += this.maxConcurrentSteps) {
      const batch = level.slice(i, i + this.maxConcurrentSteps);

      const batchPromises = batch.map(async (step) => {
        // Collect inputs from dependencies
        const input = this.collectInputs(step, completedResults);

        // Execute step
        const result = await this.executeStepWithRetry(
          step,
          input,
          context,
          executionId
        );

        levelResults.set(step.id, result);

        // Check for failure
        if (result.status === ExecutionStatus.FAILED) {
          throw new Error(
            `Step ${step.id} failed: ${result.error?.message}`
          );
        }

        return result;
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
    }

    return levelResults;
  }

  /**
   * Collect inputs from completed dependency steps
   */
  private collectInputs(
    step: StepDefinition,
    completedResults: Map<string, StepResult>
  ): StepIO {
    const inputs: Record<string, any> = {};

    for (const depId of step.dependsOn) {
      const depResult = completedResults.get(depId);
      if (!depResult || !depResult.output) {
        throw new Error(
          `Missing output from dependency ${depId} for step ${step.id}`
        );
      }
      inputs[depId] = depResult.output.data;
    }

    return {
      schema: step.inputSchema,
      data: inputs,
    };
  }

  /**
   * Execute entire DAG
   */
  async executeDAG(
    steps: StepDefinition[],
    context: ExecutionContext,
    executionId: string,
    initialInput?: Record<string, any>
  ): Promise<Map<string, StepResult>> {
    // Validate DAG structure
    this.validateDAG(steps);

    // Get execution levels
    const levels = this.getExecutionLevels(steps);

    console.log(
      `Executing DAG with ${steps.length} steps in ${levels.length} levels`
    );

    const allResults = new Map<string, StepResult>();

    // Add initial input as a pseudo-result if provided
    if (initialInput) {
      for (const [key, value] of Object.entries(initialInput)) {
        allResults.set(key, {
          stepId: key,
          status: ExecutionStatus.COMPLETED,
          output: {
            schema: {},
            data: value,
          },
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 0,
          attemptNumber: 1,
          evidence: [],
          logs: [],
        });
      }
    }

    // Execute each level sequentially
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      console.log(
        `Executing level ${i + 1}/${levels.length} with ${level.length} steps`
      );

      try {
        const levelResults = await this.executeLevel(
          level,
          allResults,
          context,
          executionId
        );

        // Merge results
        for (const [stepId, result] of levelResults) {
          allResults.set(stepId, result);
        }
      } catch (error) {
        console.error(`Level ${i + 1} failed:`, error);
        throw error;
      }
    }

    return allResults;
  }
}
