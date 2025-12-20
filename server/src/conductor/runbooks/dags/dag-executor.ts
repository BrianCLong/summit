/**
 * DAG Executor
 *
 * Executes DAG-based runbooks with:
 * - Topological sorting for dependency resolution
 * - Parallel execution where possible
 * - Gate enforcement (preconditions/postconditions)
 * - Replay logging
 * - Citation validation and publication blocking
 * - Benchmark timing
 */

import {
  RunbookDAG,
  RunbookContext,
  DAGNode,
  DAGExecutionResult,
  NodeExecutionResult,
  Evidence,
  Citation,
  CryptographicProof,
  LegalBasis,
  DataLicense,
} from './types';
import { ReplayLog } from './replay-log';
import { GateExecutor } from './gates';
import { CitationValidator } from './citation-validator';
import { v4 as uuidv4 } from 'uuid';

/**
 * DAG Executor
 */
export class DAGExecutor {
  private replayLog: ReplayLog;

  constructor(private privateKey?: string, private publicKey?: string) {
    this.replayLog = new ReplayLog(privateKey, publicKey);
  }

  /**
   * Execute a runbook DAG
   */
  async execute(
    dag: RunbookDAG,
    input: {
      tenantId: string;
      userId: string;
      legalBasis: LegalBasis;
      dataLicenses: DataLicense[];
      inputData: Record<string, any>;
    },
  ): Promise<DAGExecutionResult> {
    const executionId = uuidv4();
    const startTime = new Date();

    // Initialize context
    const context: RunbookContext = {
      runbookId: dag.id,
      executionId,
      tenantId: input.tenantId,
      userId: input.userId,
      input: input.inputData,
      state: new Map(),
      evidence: [],
      citations: [],
      proofs: [],
      kpis: {},
      legalBasis: input.legalBasis,
      dataLicenses: input.dataLicenses,
      startTime,
      replayLog: [],
    };

    // Topologically sort nodes
    const sortedNodes = this.topologicalSort(dag.nodes);

    // Track node results
    const nodeResults = new Map<string, NodeExecutionResult>();
    const nodeDurations: Record<string, number> = {};
    const errors: Array<{ nodeId: string; error: Error }> = [];

    // Execute nodes in topological order (with parallelization where possible)
    for (const batch of this.createExecutionBatches(sortedNodes)) {
      await Promise.all(
        batch.map(async (node) => {
          const nodeStartTime = Date.now();
          this.replayLog.addNodeStart(node.id);

          try {
            // Execute precondition gates
            const preconditionsPassed = await this.checkPreconditions(node, context);

            if (!preconditionsPassed.passed) {
              throw new Error(`Precondition failed: ${preconditionsPassed.reason}`);
            }

            // Execute node
            const result = await this.executeNode(node, context);

            // Execute postcondition gates
            const postconditionsPassed = await this.checkPostconditions(node, context, result);

            if (!postconditionsPassed.passed) {
              throw new Error(`Postcondition failed: ${postconditionsPassed.reason}`);
            }

            // Update context with results
            this.updateContext(context, result);

            // Store result
            nodeResults.set(node.id, result);

            // Track duration
            const duration = Date.now() - nodeStartTime;
            nodeDurations[node.id] = duration;

            // Log completion
            this.replayLog.addNodeComplete(node.id, result.success, duration);

            // Check benchmark
            if (node.estimatedDuration && duration > node.estimatedDuration * 1.5) {
              console.warn(
                `Node ${node.id} took ${duration}ms, expected ${node.estimatedDuration}ms (50% over benchmark)`,
              );
            }
          } catch (error) {
            const err = error as Error;
            errors.push({ nodeId: node.id, error: err });
            this.replayLog.addNodeError(node.id, err);

            // Attempt rollback if available
            if (node.rollback) {
              try {
                await node.rollback(context);
              } catch (rollbackError) {
                console.error(`Rollback failed for node ${node.id}:`, rollbackError);
              }
            }

            // Stop execution on error
            throw err;
          }
        }),
      );
    }

    // Calculate total duration
    const totalDuration = Date.now() - startTime.getTime();

    // Check publication gates
    const publicationCheck = await this.checkPublicationGates(dag, context);

    // Build result
    const result: DAGExecutionResult = {
      executionId,
      success: errors.length === 0 && publicationCheck.allowed,
      evidence: context.evidence,
      citations: context.citations,
      proofs: context.proofs,
      kpis: context.kpis,
      totalDuration,
      nodeDurations,
      benchmarkComparison: {
        expectedTotal: dag.benchmarks.total,
        actualTotal: totalDuration,
        withinBenchmark: totalDuration <= dag.benchmarks.total * 1.2, // 20% tolerance
      },
      publicationAllowed: publicationCheck.allowed,
      publicationBlockReasons: publicationCheck.reasons,
      replayLog: this.replayLog.getEntries(),
      errors,
    };

    // Update context replay log
    context.replayLog = this.replayLog.getEntries();

    return result;
  }

  /**
   * Execute a single node with timeout and retry
   */
  private async executeNode(node: DAGNode, context: RunbookContext): Promise<NodeExecutionResult> {
    const maxRetries = node.retryPolicy?.maxRetries || 0;
    const backoffMs = node.retryPolicy?.backoffMs || 1000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Apply timeout if specified
        if (node.timeout) {
          return await this.executeWithTimeout(node.execute(context), node.timeout);
        } else {
          return await node.execute(context);
        }
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute a promise with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }

  /**
   * Check preconditions
   */
  private async checkPreconditions(
    node: DAGNode,
    context: RunbookContext,
  ): Promise<{ passed: boolean; reason?: string }> {
    for (const gate of node.preconditions) {
      const result = await GateExecutor.executePrecondition(gate, context);
      this.replayLog.addGateCheck(node.id, gate.name, result.passed, result.reason);

      if (!result.passed) {
        return { passed: false, reason: result.reason };
      }
    }

    return { passed: true };
  }

  /**
   * Check postconditions
   */
  private async checkPostconditions(
    node: DAGNode,
    context: RunbookContext,
    result: NodeExecutionResult,
  ): Promise<{ passed: boolean; reason?: string }> {
    for (const gate of node.postconditions) {
      const gateResult = await GateExecutor.executePostcondition(gate, context, result);
      this.replayLog.addGateCheck(node.id, gate.name, gateResult.passed, gateResult.reason);

      if (!gateResult.passed) {
        return { passed: false, reason: gateResult.reason };
      }
    }

    return { passed: true };
  }

  /**
   * Update context with node execution results
   */
  private updateContext(context: RunbookContext, result: NodeExecutionResult): void {
    // Add evidence
    context.evidence.push(...result.evidence);

    // Add citations
    context.citations.push(...result.citations);

    // Add proofs
    context.proofs.push(...result.proofs);

    // Update KPIs
    Object.assign(context.kpis, result.kpis);

    // Log evidence collection
    for (const evidence of result.evidence) {
      this.replayLog.addEvidenceCollected('context', evidence);
    }
  }

  /**
   * Check publication gates
   */
  private async checkPublicationGates(
    dag: RunbookDAG,
    context: RunbookContext,
  ): Promise<{ allowed: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    // Check all publication gates
    for (const gate of dag.publicationGates) {
      // Create a synthetic result for publication gates
      const syntheticResult: NodeExecutionResult = {
        success: true,
        evidence: context.evidence,
        citations: context.citations,
        proofs: context.proofs,
        kpis: context.kpis,
        duration: 0,
      };

      const gateResult = await GateExecutor.executePostcondition(gate, context, syntheticResult);

      if (!gateResult.passed) {
        reasons.push(`Publication gate '${gate.name}' failed: ${gateResult.reason}`);
        this.replayLog.addPublicationBlocked('publication', gateResult.reason || 'Unknown reason');
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Topological sort of DAG nodes
   */
  private topologicalSort(nodes: DAGNode[]): DAGNode[] {
    const sorted: DAGNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;

      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected at node ${nodeId}`);
      }

      visiting.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      // Visit dependencies first
      for (const depId of node.dependencies) {
        visit(depId);
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      sorted.push(node);
    };

    // Visit all nodes
    for (const node of nodes) {
      visit(node.id);
    }

    return sorted;
  }

  /**
   * Create execution batches for parallel execution
   *
   * Nodes in the same batch have no dependencies on each other and can run in parallel.
   */
  private createExecutionBatches(sortedNodes: DAGNode[]): DAGNode[][] {
    const batches: DAGNode[][] = [];
    const completed = new Set<string>();

    while (completed.size < sortedNodes.length) {
      const batch: DAGNode[] = [];

      for (const node of sortedNodes) {
        if (completed.has(node.id)) continue;

        // Check if all dependencies are completed
        const dependenciesMet = node.dependencies.every((depId) => completed.has(depId));

        if (dependenciesMet) {
          batch.push(node);
        }
      }

      if (batch.length === 0) {
        throw new Error('Unable to schedule nodes - possible circular dependency');
      }

      batches.push(batch);

      // Mark batch as completed
      for (const node of batch) {
        completed.add(node.id);
      }
    }

    return batches;
  }

  /**
   * Get the replay log
   */
  getReplayLog(): ReplayLog {
    return this.replayLog;
  }

  /**
   * Verify replay log integrity
   */
  verifyReplayLogIntegrity(publicKey?: string): { valid: boolean; error?: string } {
    return this.replayLog.verifyIntegrity(publicKey);
  }
}
