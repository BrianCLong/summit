// MCP Orchestrator - Multi-agent workflow orchestration with blackboard architecture
// Provides adaptive, intelligence-driven process automation with governance

import { randomUUID as uuid } from 'crypto';
import { EventEmitter } from 'events';
import { MCPClient, mcpRegistry } from './client.js';
import logger from '../../config/logger.js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface WorkflowStep {
  id: string;
  name: string;
  tool: string;
  server?: string; // Optional - auto-routes if not specified
  args: Record<string, any> | ((ctx: BlackboardContext) => Record<string, any>);
  dependsOn?: string[];
  retryPolicy?: RetryPolicy;
  timeout?: number;
  condition?: (ctx: BlackboardContext) => boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  onError?: 'abort' | 'continue' | 'rollback';
  budgetLimit?: number; // Max cost in cents
  governancePolicy?: GovernancePolicy;
}

export interface GovernancePolicy {
  requireApproval?: string[]; // Tool names requiring approval
  auditLevel: 'minimal' | 'standard' | 'full';
  allowedScopes: string[];
}

export interface BlackboardContext {
  workflowId: string;
  executionId: string;
  state: Record<string, any>;
  results: Record<string, any>;
  errors: Record<string, Error>;
  metrics: ExecutionMetrics;
  getUserScopes: () => string[];
}

export interface ExecutionMetrics {
  startTime: number;
  stepDurations: Record<string, number>;
  totalCost: number;
  retryCount: number;
}

export interface StepResult {
  stepId: string;
  status: 'success' | 'failed' | 'skipped';
  result?: any;
  error?: Error;
  durationMs: number;
  server: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  context: BlackboardContext;
  stepResults: StepResult[];
  startedAt: Date;
  completedAt?: Date;
  evaluation?: SelfEvaluation;
}

export interface SelfEvaluation {
  score: number; // 0-100
  insights: string[];
  improvements: string[];
  nextRecommendations: string[];
}

// ============================================================================
// MCP Orchestrator
// ============================================================================

export class MCPOrchestrator extends EventEmitter {
  private client: MCPClient;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private userScopes: string[] = [];

  constructor(client?: MCPClient) {
    super();
    this.client = client || new MCPClient(mcpRegistry.getAllServers());
  }

  // --------------------------------------------------------------------------
  // Workflow Registration
  // --------------------------------------------------------------------------

  registerWorkflow(workflow: WorkflowDefinition): void {
    this.validateWorkflow(workflow);
    this.workflows.set(workflow.id, workflow);
    logger.info(`Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  unregisterWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  // --------------------------------------------------------------------------
  // Workflow Execution
  // --------------------------------------------------------------------------

  async executeWorkflow(
    workflowId: string,
    initialState: Record<string, any> = {},
    userScopes: string[] = [],
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    this.userScopes = userScopes;

    const executionId = uuid();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      context: this.createContext(workflowId, executionId, initialState),
      stepResults: [],
      startedAt: new Date(),
    };

    this.executions.set(executionId, execution);
    this.emit('workflow:start', { executionId, workflowId });

    try {
      // Build execution DAG and run in topological order
      const orderedSteps = this.topologicalSort(workflow.steps);

      for (const step of orderedSteps) {
        // Check budget
        if (workflow.budgetLimit && execution.context.metrics.totalCost >= workflow.budgetLimit) {
          logger.warn(`Budget limit reached for workflow ${workflowId}`);
          execution.status = 'failed';
          break;
        }

        const result = await this.executeStep(step, execution);
        execution.stepResults.push(result);

        if (result.status === 'failed' && workflow.onError === 'abort') {
          execution.status = 'failed';
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
      }

      // Self-evaluation
      execution.evaluation = this.evaluateExecution(execution);
      execution.completedAt = new Date();

      this.emit('workflow:complete', { executionId, status: execution.status });

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      this.emit('workflow:error', { executionId, error });
      throw error;
    }

    return execution;
  }

  // --------------------------------------------------------------------------
  // Step Execution
  // --------------------------------------------------------------------------

  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
  ): Promise<StepResult> {
    const startTime = Date.now();
    const ctx = execution.context;

    // Check condition
    if (step.condition && !step.condition(ctx)) {
      return {
        stepId: step.id,
        status: 'skipped',
        durationMs: 0,
        server: 'N/A',
      };
    }

    // Wait for dependencies
    await this.waitForDependencies(step, execution);

    // Resolve dynamic args
    const args = typeof step.args === 'function' ? step.args(ctx) : step.args;

    // Find server
    const serverName = step.server || this.findServerForTool(step.tool);
    if (!serverName) {
      const error = new Error(`No server found for tool '${step.tool}'`);
      ctx.errors[step.id] = error;
      return {
        stepId: step.id,
        status: 'failed',
        error,
        durationMs: Date.now() - startTime,
        server: 'N/A',
      };
    }

    // Execute with retry policy
    const policy = step.retryPolicy || { maxAttempts: 1, backoffMs: 1000 };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        this.emit('step:start', { stepId: step.id, attempt });

        const result = await this.client.executeTool(
          serverName,
          step.tool,
          args,
          this.userScopes,
        );

        // Store result in blackboard
        ctx.results[step.id] = result;
        ctx.metrics.stepDurations[step.id] = Date.now() - startTime;

        this.emit('step:complete', { stepId: step.id, result });

        return {
          stepId: step.id,
          status: 'success',
          result,
          durationMs: Date.now() - startTime,
          server: serverName,
        };

      } catch (error) {
        lastError = error as Error;
        ctx.metrics.retryCount++;

        if (attempt < policy.maxAttempts) {
          const delay = policy.backoffMs * Math.pow(policy.backoffMultiplier || 2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    ctx.errors[step.id] = lastError!;
    this.emit('step:failed', { stepId: step.id, error: lastError });

    return {
      stepId: step.id,
      status: 'failed',
      error: lastError,
      durationMs: Date.now() - startTime,
      server: serverName,
    };
  }

  // --------------------------------------------------------------------------
  // Blackboard Context
  // --------------------------------------------------------------------------

  private createContext(
    workflowId: string,
    executionId: string,
    initialState: Record<string, any>,
  ): BlackboardContext {
    return {
      workflowId,
      executionId,
      state: { ...initialState },
      results: {},
      errors: {},
      metrics: {
        startTime: Date.now(),
        stepDurations: {},
        totalCost: 0,
        retryCount: 0,
      },
      getUserScopes: () => this.userScopes,
    };
  }

  // --------------------------------------------------------------------------
  // Self-Evaluation
  // --------------------------------------------------------------------------

  private evaluateExecution(execution: WorkflowExecution): SelfEvaluation {
    const { stepResults, context } = execution;
    const successful = stepResults.filter(r => r.status === 'success').length;
    const total = stepResults.length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const avgDuration = Object.values(context.metrics.stepDurations).reduce(
      (a, b) => a + b,
      0,
    ) / Math.max(Object.keys(context.metrics.stepDurations).length, 1);

    const insights: string[] = [];
    const improvements: string[] = [];
    const recommendations: string[] = [];

    // Analyze performance
    if (successRate < 80) {
      insights.push(`Low success rate: ${successRate.toFixed(1)}%`);
      improvements.push('Review failing steps and add more robust error handling');
    }

    if (context.metrics.retryCount > 3) {
      insights.push(`High retry count: ${context.metrics.retryCount}`);
      improvements.push('Consider increasing timeouts or reviewing server health');
    }

    if (avgDuration > 5000) {
      insights.push(`Slow average step duration: ${avgDuration.toFixed(0)}ms`);
      improvements.push('Optimize slow steps or add caching');
    }

    // Generate recommendations
    const failedSteps = stepResults.filter(r => r.status === 'failed');
    for (const step of failedSteps) {
      recommendations.push(`Investigate failure in step '${step.stepId}': ${step.error?.message}`);
    }

    return {
      score: Math.round(successRate),
      insights,
      improvements,
      nextRecommendations: recommendations,
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private validateWorkflow(workflow: WorkflowDefinition): void {
    const stepIds = new Set(workflow.steps.map(s => s.id));
    for (const step of workflow.steps) {
      for (const dep of step.dependsOn || []) {
        if (!stepIds.has(dep)) {
          throw new Error(`Step '${step.id}' depends on unknown step '${dep}'`);
        }
      }
    }
  }

  private topologicalSort(steps: WorkflowStep[]): WorkflowStep[] {
    const sorted: WorkflowStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const stepMap = new Map(steps.map(s => [s.id, s]));

    const visit = (step: WorkflowStep) => {
      if (visited.has(step.id)) return;
      if (visiting.has(step.id)) {
        throw new Error(`Circular dependency detected at step '${step.id}'`);
      }
      visiting.add(step.id);
      for (const depId of step.dependsOn || []) {
        const dep = stepMap.get(depId);
        if (dep) visit(dep);
      }
      visiting.delete(step.id);
      visited.add(step.id);
      sorted.push(step);
    };

    for (const step of steps) {
      visit(step);
    }

    return sorted;
  }

  private async waitForDependencies(
    step: WorkflowStep,
    execution: WorkflowExecution,
  ): Promise<void> {
    const deps = step.dependsOn || [];
    for (const depId of deps) {
      const depResult = execution.stepResults.find(r => r.stepId === depId);
      if (!depResult) {
        throw new Error(`Dependency '${depId}' not yet executed`);
      }
    }
  }

  private findServerForTool(toolName: string): string | undefined {
    const servers = mcpRegistry.findServersWithTool(toolName);
    return servers[0]; // Return first available
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --------------------------------------------------------------------------
  // Query & Management
  // --------------------------------------------------------------------------

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  listExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }
}

// ============================================================================
// Pre-built Workflow Recipes
// ============================================================================

export const WorkflowRecipes = {
  /** Lead assignment workflow with scoring and routing */
  leadAssignment: (leadId: string): WorkflowDefinition => ({
    id: 'lead-assignment',
    name: 'Intelligent Lead Assignment',
    steps: [
      {
        id: 'fetch-lead',
        name: 'Fetch Lead Data',
        tool: 'crm.getLead',
        args: { leadId },
      },
      {
        id: 'score-lead',
        name: 'Score Lead',
        tool: 'ml.scoreLead',
        args: (ctx) => ({ lead: ctx.results['fetch-lead'] }),
        dependsOn: ['fetch-lead'],
      },
      {
        id: 'find-rep',
        name: 'Find Best Rep',
        tool: 'routing.findRep',
        args: (ctx) => ({
          score: ctx.results['score-lead'].score,
          territory: ctx.results['fetch-lead'].territory,
        }),
        dependsOn: ['score-lead'],
      },
      {
        id: 'assign',
        name: 'Assign Lead',
        tool: 'crm.assignLead',
        args: (ctx) => ({
          leadId,
          repId: ctx.results['find-rep'].repId,
        }),
        dependsOn: ['find-rep'],
      },
    ],
    onError: 'abort',
  }),

  /** Graph entity enrichment pipeline */
  entityEnrichment: (entityId: string): WorkflowDefinition => ({
    id: 'entity-enrichment',
    name: 'Entity Enrichment Pipeline',
    steps: [
      {
        id: 'fetch-entity',
        name: 'Fetch Entity',
        tool: 'graph.getEntity',
        args: { entityId },
      },
      {
        id: 'enrich-osint',
        name: 'OSINT Enrichment',
        tool: 'osint.enrich',
        args: (ctx) => ({ entity: ctx.results['fetch-entity'] }),
        dependsOn: ['fetch-entity'],
        retryPolicy: { maxAttempts: 3, backoffMs: 2000 },
      },
      {
        id: 'enrich-ml',
        name: 'ML Classification',
        tool: 'ml.classify',
        args: (ctx) => ({ entity: ctx.results['fetch-entity'] }),
        dependsOn: ['fetch-entity'],
      },
      {
        id: 'merge-results',
        name: 'Merge Enrichments',
        tool: 'graph.updateEntity',
        args: (ctx) => ({
          entityId,
          osint: ctx.results['enrich-osint'],
          classification: ctx.results['enrich-ml'],
        }),
        dependsOn: ['enrich-osint', 'enrich-ml'],
      },
    ],
    budgetLimit: 500, // 500 cents max
  }),

  /** Audit trail generation */
  auditTrail: (action: string, resourceId: string): WorkflowDefinition => ({
    id: 'audit-trail',
    name: 'Audit Trail Generation',
    steps: [
      {
        id: 'record-audit',
        name: 'Record Audit Entry',
        tool: 'audit.record',
        args: { action, resourceId, timestamp: new Date().toISOString() },
      },
      {
        id: 'notify-compliance',
        name: 'Notify Compliance',
        tool: 'notify.send',
        args: (ctx) => ({
          channel: 'compliance',
          message: `Audit: ${action} on ${resourceId}`,
        }),
        dependsOn: ['record-audit'],
        condition: (ctx) => ctx.state.notifyCompliance === true,
      },
    ],
    governancePolicy: {
      auditLevel: 'full',
      allowedScopes: ['audit:write'],
    },
  }),
};

// ============================================================================
// Singleton Export
// ============================================================================

export const orchestrator = new MCPOrchestrator();
