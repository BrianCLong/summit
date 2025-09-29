// Main Conductor Implementation
// Orchestrates MoE routing with MCP tool execution and security controls

import { ConductInput, ConductResult, RouteDecision, ExpertType } from './types';
import { moERouter } from './router';
import { mcpClient, mcpRegistry, executeToolAnywhere, initializeMCPClient } from './mcp/client';
import { v4 as uuid } from 'uuid';
import { BudgetAdmissionController, createBudgetController } from './admission/budget-control';
import { runsRepo } from '../maestro/runs/runs-repo.js'; // Import runsRepo
import Redis from 'ioredis'; // Assuming Redis is used for budget control

export interface ConductorConfig {
  enabledExperts: ExpertType[];
  defaultTimeoutMs: number;
  maxConcurrentTasks: number;
  auditEnabled: boolean;
  llmProviders: {
    light?: {
      endpoint: string;
      apiKey: string;
      model: string;
    };
    heavy?: {
      endpoint: string;
      apiKey: string;
      model: string;
    };
  };
}

export class Conductor {
  private activeTaskCount = 0;
  private queue: { input: ConductInput; resolve: (r: ConductResult)=>void; reject: (e: any)=>void }[] = [];
  private auditLog: any[] = []; // Keep existing auditLog
  private budgetController: BudgetAdmissionController; // Add this line

  constructor(private config: ConductorConfig) {
    // Initialize MCP client with default options
    initializeMCPClient({
      timeout: config.defaultTimeoutMs,
      retryAttempts: 3,
      retryDelay: 1000,
    });
    // Initialize budget controller
    // In a real application, Redis client should be injected or managed globally
    const redisClient = new Redis();
    this.budgetController = createBudgetController(redisClient);
  }

  /**
   * Execute a task using the MoE system
   */
  public async conduct(input: ConductInput): Promise<ConductResult> {
    if (this.activeTaskCount >= this.config.maxConcurrentTasks) {
      return new Promise<ConductResult>((resolve, reject) => {
        this.queue.push({ input, resolve, reject });
      });
    }

    this.activeTaskCount++;
    const auditId = this.config.auditEnabled ? uuid() : undefined;
    const startTime = performance.now();

    // Determine tenantId for budget control
    const tenantId = input.userContext?.tenantId || 'global'; // Assuming userContext has tenantId

    try {
      // Fetch current run cost for preemption check
      let currentRunCost = 0;
      if (input.runId) {
        const runRecord = await runsRepo.get(input.runId, tenantId);
        if (runRecord) {
          currentRunCost = runRecord.cost || 0;
        }
      }

      // Route to expert
      const decision = moERouter.route(input);

      // Placeholder for estimated cost of the current task
      const estimatedTaskCost = 0.01; 

      // Perform budget admission check for the current task + accumulated run cost
      const admissionDecision = await this.budgetController.admit(decision.expert, estimatedTaskCost, {
        userId: input.userContext?.userId,
        tenantId: tenantId,
      });

      if (!admissionDecision.admit) {
        // Preempt the run if budget is exceeded
        if (input.runId) {
          await runsRepo.update(input.runId, { status: 'failed', error_message: 'Budget cap exceeded' }, tenantId);
          this.logAudit({
            auditId,
            input,
            event: 'run_preempted',
            reason: 'Budget cap exceeded',
            runId: input.runId,
            timestamp: new Date().toISOString(),
          });
        }
        throw new Error(`Budget admission denied: ${admissionDecision.reason}`);
      }

      // Security check
      await this.validateSecurity(input, decision);

      // Execute with selected expert
      const result = await this.executeWithExpert(decision.expert, input, decision);

      const endTime = performance.now();
      const conductResult: ConductResult = {
        expertId: decision.expert,
        output: result.output,
        logs: result.logs,
        cost: result.cost || 0,
        latencyMs: Math.round(endTime - startTime),
        auditId,
      };

      // Record actual spending for the task
      if (result.cost) {
        await this.budgetController.recordSpending(decision.expert, result.cost, {
          userId: input.userContext?.userId,
          tenantId: tenantId,
        });
      }

      // Audit logging
      if (this.config.auditEnabled) {
        this.logAudit({
          auditId,
          input,
          decision,
          result: conductResult,
          timestamp: new Date().toISOString(),
        });
      }

      return conductResult;
    } catch (error) {
      const endTime = performance.now();

      const errorResult: ConductResult = {
        expertId: 'LLM_LIGHT', // fallback
        output: null,
        logs: [`Error: ${error.message}`],
        cost: 0,
        latencyMs: Math.round(endTime - startTime),
        error: error.message,
        auditId,
      };

      if (this.config.auditEnabled) {
        this.logAudit({
          auditId,
          input,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      return errorResult;
    } finally {
      this.activeTaskCount--;
      // drain one from queue
      const next = this.queue.shift();
      if (next) {
        this.conduct(next.input).then(next.resolve).catch(next.reject);
      }
    }
  }

  /**
   * Preview routing decision without execution
   */
  public previewRouting(input: ConductInput): RouteDecision {
    return moERouter.route(input);
  }

  /**
   * Validate security constraints
   */
  private async validateSecurity(input: ConductInput, decision: RouteDecision): Promise<void> {
    // PII/Secret data constraints
    if (input.sensitivity === 'secret') {
      if (decision.expert === 'LLM_LIGHT' || decision.expert === 'LLM_HEAVY') {
        const llmConfig =
          decision.expert === 'LLM_LIGHT'
            ? this.config.llmProviders.light
            : this.config.llmProviders.heavy;

        // Check if LLM provider has enterprise agreement for secret data
        if (!llmConfig?.endpoint.includes('enterprise')) {
          throw new Error('Secret data cannot be processed by non-enterprise LLM providers');
        }
      }
    }

    // Check user permissions for tool usage
    if (input.userContext?.scopes) {
      const requiredScopes = this.getRequiredScopes(decision.expert);
      const userScopes = input.userContext.scopes;

      const hasPermission = requiredScopes.every((scope) => userScopes.includes(scope));
      if (!hasPermission) {
        throw new Error(
          `Insufficient permissions for ${decision.expert}. Required: ${requiredScopes.join(', ')}`,
        );
      }
    }
  }

  /**
   * Get required scopes for an expert
   */
  private getRequiredScopes(expert: ExpertType): string[] {
    const scopeMap: Record<ExpertType, string[]> = {
      LLM_LIGHT: [],
      LLM_HEAVY: [],
      GRAPH_TOOL: ['graph:read'],
      RAG_TOOL: ['data:read'],
      FILES_TOOL: ['files:read'],
      OSINT_TOOL: ['osint:read'],
      EXPORT_TOOL: ['export:create'],
    };

    return scopeMap[expert] || [];
  }

  /**
   * Execute task with the selected expert
   */
  private async executeWithExpert(
    expert: ExpertType,
    input: ConductInput,
    decision: RouteDecision,
  ): Promise<{ output: any; logs: string[]; cost?: number }> {
    const logs: string[] = [`Routed to ${expert}: ${decision.reason}`];

    switch (expert) {
      case 'GRAPH_TOOL':
        return this.executeGraphTool(input, logs);

      case 'FILES_TOOL':
        return this.executeFilesTool(input, logs);

      case 'OSINT_TOOL':
        return this.executeOsintTool(input, logs);

      case 'EXPORT_TOOL':
        return this.executeExportTool(input, logs);

      case 'RAG_TOOL':
        return this.executeRagTool(input, logs);

      case 'LLM_LIGHT':
      case 'LLM_HEAVY':
        return this.executeLLM(expert, input, logs);

      default:
        throw new Error(`Expert ${expert} not implemented`);
    }
  }

  /**
   * Execute graph operations via MCP
   */
  private async executeGraphTool(
    input: ConductInput,
    logs: string[],
  ): Promise<{ output: any; logs: string[]; cost?: number }> {
    logs.push('Executing graph operations via MCP');

    try {
      // Simple Cypher detection and execution
      if (
        input.task.toLowerCase().includes('cypher') ||
        input.task.toLowerCase().includes('match')
      ) {
        // Extract Cypher query from task (simplified)
        const cypherMatch = input.task.match(/(?:cypher|MATCH).*?(?:\n|$)/i);
        const cypher = cypherMatch ? cypherMatch[0] : input.task;

        const result = await executeToolAnywhere(
          'graph.query',
          {
            cypher: cypher,
            params: {},
            tenantId: input.investigationId,
          },
          input.userContext?.scopes,
        );

        logs.push(`Graph query executed on server: ${result.serverName}`);
        return {
          output: result.result,
          logs,
          cost: 0.001, // Fixed cost for graph operations
        };
      } else {
        // Algorithm execution
        const algName = this.detectAlgorithm(input.task);
        const result = await executeToolAnywhere(
          'graph.alg',
          {
            name: algName,
            args: this.extractAlgorithmArgs(input.task),
            tenantId: input.investigationId,
          },
          input.userContext?.scopes,
        );

        logs.push(`Graph algorithm '${algName}' executed`);
        return {
          output: result.result,
          logs,
          cost: 0.002,
        };
      }
    } catch (error) {
      logs.push(`Graph operation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute file operations via MCP
   */
  private async executeFilesTool(
    input: ConductInput,
    logs: string[],
  ): Promise<{ output: any; logs: string[]; cost?: number }> {
    logs.push('Executing file operations via MCP');

    try {
      if (input.task.toLowerCase().includes('search')) {
        const query = this.extractSearchQuery(input.task);
        const result = await executeToolAnywhere(
          'files.search',
          {
            query: query,
            limit: 10,
          },
          input.userContext?.scopes,
        );

        logs.push(`File search completed: ${result.result.results.length} files found`);
        return {
          output: result.result,
          logs,
          cost: 0.001,
        };
      } else if (
        input.task.toLowerCase().includes('read') ||
        input.task.toLowerCase().includes('get')
      ) {
        const filePath = this.extractFilePath(input.task);
        const result = await executeToolAnywhere(
          'files.get',
          {
            path: filePath,
            encoding: 'utf8',
          },
          input.userContext?.scopes,
        );

        logs.push(`File read: ${filePath}`);
        return {
          output: result.result,
          logs,
          cost: 0.0005,
        };
      } else {
        // Default to file listing
        const result = await executeToolAnywhere(
          'files.list',
          {
            path: '.',
            recursive: false,
          },
          input.userContext?.scopes,
        );

        return {
          output: result.result,
          logs,
          cost: 0.0002,
        };
      }
    } catch (error) {
      logs.push(`File operation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute OSINT operations (placeholder)
   */
  private async executeOsintTool(
    input: ConductInput,
    logs: string[],
  ): Promise<{ output: any; logs: string[]; cost?: number }> {
    logs.push('OSINT tool execution (mock)');

    // Mock OSINT result
    return {
      output: {
        query: input.task,
        sources: ['mock_source_1', 'mock_source_2'],
        findings: ['Mock OSINT finding 1', 'Mock OSINT finding 2'],
        confidence: 0.75,
      },
      logs,
      cost: 0.005,
    };
  }

  /**
   * Execute export operations (placeholder)
   */
  private async executeExportTool(
    input: ConductInput,
    logs: string[],
  ): Promise<{ output: any; logs: string[]; cost?: number }> {
    logs.push('Export tool execution (mock)');

    return {
      output: {
        format: 'pdf',
        status: 'generated',
        downloadUrl: '/api/exports/mock-report-123.pdf',
        size: '2.5MB',
      },
      logs,
      cost: 0.003,
    };
  }

  /**
   * Execute RAG operations (placeholder)
   */
  private async executeRagTool(
    input: ConductInput,
    logs: string[],
  ): Promise<{ output: any; logs: string[]; cost?: number }> {
    logs.push('RAG tool execution (mock)');

    return {
      output: {
        answer: `Based on the investigation context, here is the response to: "${input.task}"`, 
        sources: ['Document A', 'Entity B', 'Relationship C'],
        confidence: 0.85,
        citations: ['doc_1', 'doc_2'],
      },
      logs,
      cost: 0.002,
    };
  }

  /**
   * Execute LLM operations (placeholder)
   */
  private async executeLLM(
    expert: ExpertType,
    input: ConductInput,
    logs: string[],
  ): Promise<{ output: any; logs: string[]; cost?: number }> {
    const config =
      expert === 'LLM_LIGHT' ? this.config.llmProviders.light : this.config.llmProviders.heavy;

    if (!config) {
      throw new Error(`${expert} provider not configured`);
    }

    logs.push(`Executing ${expert} with model: ${config.model}`);

    // Mock LLM execution
    const costPerToken = expert === 'LLM_LIGHT' ? 0.0001 : 0.001;
    const estimatedTokens = Math.ceil(input.task.length / 4);

    return {
      output: {
        response: `Mock ${expert} response for: "${input.task}"`, 
        model: config.model,
        usage: {
          promptTokens: estimatedTokens,
          completionTokens: estimatedTokens * 2,
          totalTokens: estimatedTokens * 3,
        },
      },
      logs,
      cost: costPerToken * estimatedTokens * 3,
    };
  }

  // Helper methods for task parsing
  private detectAlgorithm(task: string): string {
    const lower = task.toLowerCase();
    if (lower.includes('pagerank')) return 'pagerank';
    if (lower.includes('community')) return 'community';
    if (lower.includes('shortest') || lower.includes('path')) return 'shortestPath';
    if (lower.includes('betweenness')) return 'betweenness';
    if (lower.includes('closeness')) return 'closeness';
    return 'pagerank'; // default
  }

  private extractAlgorithmArgs(task: string): Record<string, any> {
    // Simple args extraction (in production, this would be more sophisticated)
    return {};
  }

  private extractSearchQuery(task: string): string {
    const match = task.match(/search.*?for\s+["']([^"']+)["']/i);
    return match ? match[1] : task.split(' ').slice(-3).join(' ');
  }

  private extractFilePath(task: string): string {
    const match = task.match(/["']([^"']*\\[a-zA-Z0-9]+)["']/);
    return match ? match[1] : 'example.txt';
  }

  /**
   * Log audit events
   */
  private logAudit(event: any): void {
    this.auditLog.push(event);
    // In production, this would persist to database
    console.log('AUDIT:', JSON.stringify(event, null, 2));
  }

  /**
   * Get conductor statistics
   */
  public getStats(): any {
    const routingStats = moERouter.getRoutingStats();

    return {
      activeTaskCount: this.activeTaskCount,
      auditLogSize: this.auditLog.length,
      routingStats,
      mcpConnectionStatus: mcpClient?.getConnectionStatus() || {},
      config: {
        maxConcurrentTasks: this.config.maxConcurrentTasks,
        enabledExperts: this.config.enabledExperts,
        auditEnabled: this.config.auditEnabled,
      },
    };
  }

  /**
   * Shutdown conductor and cleanup resources
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down Conductor');

    // Wait for active tasks to complete (with timeout)
    const maxWait = 30000; // 30 seconds
    const startWait = Date.now();

    while (this.activeTaskCount > 0 && Date.now() - startWait < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.activeTaskCount > 0) {
      console.warn(`Shutting down with ${this.activeTaskCount} active tasks`);
    }

    // Disconnect MCP clients
    if (mcpClient) {
      await mcpClient.disconnectAll();
    }

    console.log('Conductor shutdown complete');
  }
}

// Export singleton conductor instance (initialized in server startup)
export let conductor: Conductor;

/**
 * Initialize conductor with configuration
 */
export function initializeConductor(config: ConductorConfig): void {
  conductor = new Conductor(config);
}