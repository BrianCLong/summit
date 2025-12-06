/**
 * ReAct Agent Executor
 *
 * Implements the ReAct (Reasoning + Acting) framework for autonomous agents:
 * - Thought → Action → Observation loop
 * - Plan/Research/Execute agent specialization
 * - Dynamic tool selection and invocation
 * - State management across iterations
 * - Bounded iteration with termination conditions
 *
 * Agent Types:
 * - Planner: Decomposes complex queries into sub-tasks
 * - Researcher: Gathers information from tools and knowledge
 * - Executor: Performs actions with approval gates
 * - Synthesizer: Combines results into coherent responses
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import type { MultiModelOrchestrator, InferenceRequest } from '../orchestrator/multi-model-orchestrator.js';
import type { ToolRegistry, Tool, ToolInvocationResult } from '../tools/tool-registry.js';
import type { ApprovalService } from '../approval/approval-service.js';
import type { AuditService } from '../audit/audit-service.js';
import type {
  ReActStep,
  SecurityContext,
  RiskLevel,
} from '../types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentConfig {
  orchestrator: MultiModelOrchestrator;
  toolRegistry: ToolRegistry;
  approvalService: ApprovalService;
  auditService: AuditService;
  maxIterations?: number;
  maxTokensPerStep?: number;
  thoughtTimeout?: number;
  actionTimeout?: number;
  enableParallelTools?: boolean;
}

export type AgentRole = 'planner' | 'researcher' | 'executor' | 'synthesizer';

export interface AgentTask {
  id: string;
  sessionId: string;
  query: string;
  context: AgentContext;
  securityContext: SecurityContext;
  parentTaskId?: string;
  subtasks?: AgentTask[];
}

export interface AgentContext {
  conversationHistory: Array<{ role: string; content: string }>;
  extractedEntities: Array<{ type: string; value: string }>;
  previousResults: Record<string, unknown>;
  investigation?: {
    id: string;
    name: string;
    phase: string;
  };
  constraints?: {
    maxCost?: number;
    maxTime?: number;
    requiredApprovals?: string[];
  };
}

export interface AgentState {
  taskId: string;
  role: AgentRole;
  iteration: number;
  steps: ReActStep[];
  pendingActions: PendingAction[];
  completedActions: CompletedAction[];
  observations: Observation[];
  finalAnswer?: string;
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'timeout';
  startTime: Date;
  endTime?: Date;
  totalTokens: number;
  totalCost: number;
}

export interface PendingAction {
  id: string;
  toolId: string;
  operation: string;
  parameters: Record<string, unknown>;
  riskLevel: RiskLevel;
  approvalRequestId?: string;
}

export interface CompletedAction {
  id: string;
  toolId: string;
  operation: string;
  parameters: Record<string, unknown>;
  result: unknown;
  success: boolean;
  latencyMs: number;
}

export interface Observation {
  actionId: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  taskId: string;
  success: boolean;
  answer: string;
  trace: ReActStep[];
  actions: CompletedAction[];
  totalIterations: number;
  totalTokens: number;
  totalCost: number;
  durationMs: number;
  metadata: Record<string, unknown>;
}

// =============================================================================
// REACT EXECUTOR
// =============================================================================

export class ReActExecutor extends EventEmitter {
  private config: AgentConfig;
  private orchestrator: MultiModelOrchestrator;
  private toolRegistry: ToolRegistry;
  private approvalService: ApprovalService;
  private auditService: AuditService;
  private activeStates: Map<string, AgentState> = new Map();

  constructor(config: AgentConfig) {
    super();
    this.config = {
      maxIterations: 10,
      maxTokensPerStep: 4096,
      thoughtTimeout: 30000,
      actionTimeout: 60000,
      enableParallelTools: true,
      ...config,
    };
    this.orchestrator = config.orchestrator;
    this.toolRegistry = config.toolRegistry;
    this.approvalService = config.approvalService;
    this.auditService = config.auditService;
  }

  // ===========================================================================
  // MAIN EXECUTION
  // ===========================================================================

  async execute(task: AgentTask, role: AgentRole = 'researcher'): Promise<ExecutionResult> {
    const state: AgentState = {
      taskId: task.id,
      role,
      iteration: 0,
      steps: [],
      pendingActions: [],
      completedActions: [],
      observations: [],
      status: 'running',
      startTime: new Date(),
      totalTokens: 0,
      totalCost: 0,
    };

    this.activeStates.set(task.id, state);

    // Record trace start
    await this.auditService.record({
      eventType: 'trace_started',
      sessionId: task.sessionId,
      userId: task.securityContext.userId,
      tenantId: task.securityContext.tenantId,
      traceId: task.id,
      data: {
        query: task.query,
        role,
        context: task.context,
      },
    });

    this.emit('trace:started', { taskId: task.id, role });

    try {
      // Run the ReAct loop
      const result = await this.runReActLoop(task, state);

      state.status = 'completed';
      state.endTime = new Date();
      state.finalAnswer = result;

      // Record trace completion
      await this.auditService.record({
        eventType: 'trace_completed',
        sessionId: task.sessionId,
        userId: task.securityContext.userId,
        tenantId: task.securityContext.tenantId,
        traceId: task.id,
        data: {
          success: true,
          iterations: state.iteration,
          totalTokens: state.totalTokens,
          totalCost: state.totalCost,
        },
      });

      return {
        taskId: task.id,
        success: true,
        answer: result,
        trace: state.steps,
        actions: state.completedActions,
        totalIterations: state.iteration,
        totalTokens: state.totalTokens,
        totalCost: state.totalCost,
        durationMs: Date.now() - state.startTime.getTime(),
        metadata: {},
      };
    } catch (error) {
      state.status = 'failed';
      state.endTime = new Date();

      await this.auditService.record({
        eventType: 'trace_completed',
        sessionId: task.sessionId,
        userId: task.securityContext.userId,
        tenantId: task.securityContext.tenantId,
        traceId: task.id,
        data: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          iterations: state.iteration,
        },
      });

      return {
        taskId: task.id,
        success: false,
        answer: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        trace: state.steps,
        actions: state.completedActions,
        totalIterations: state.iteration,
        totalTokens: state.totalTokens,
        totalCost: state.totalCost,
        durationMs: Date.now() - state.startTime.getTime(),
        metadata: { error: true },
      };
    } finally {
      this.activeStates.delete(task.id);
    }
  }

  // ===========================================================================
  // REACT LOOP
  // ===========================================================================

  private async runReActLoop(task: AgentTask, state: AgentState): Promise<string> {
    while (state.iteration < this.config.maxIterations!) {
      state.iteration++;

      // 1. THOUGHT: Reason about current state and decide next action
      const thought = await this.generateThought(task, state);
      this.addStep(state, 'thought', thought.content);
      state.totalTokens += thought.tokens;
      state.totalCost += thought.cost;

      this.emit('trace:step', {
        taskId: task.id,
        step: state.steps[state.steps.length - 1],
      });

      // Check if agent wants to finish
      if (thought.shouldFinish) {
        return thought.finalAnswer || 'Task completed.';
      }

      // 2. ACTION: Execute decided action(s)
      const actions = await this.parseActions(thought.content, task);

      if (actions.length === 0) {
        // No valid actions parsed - ask for clarification
        this.addStep(state, 'observation', 'No valid action could be parsed from the thought.');
        continue;
      }

      // Check risk levels and handle approvals
      for (const action of actions) {
        const riskLevel = await this.assessRisk(action, task.securityContext);
        action.riskLevel = riskLevel;

        if (riskLevel === 'prohibited') {
          this.addStep(state, 'observation', `Action ${action.toolId}.${action.operation} is prohibited.`);
          continue;
        }

        if (riskLevel === 'hitl') {
          // Request approval
          const approvalId = await this.requestApproval(action, task, state);
          action.approvalRequestId = approvalId;
          state.pendingActions.push(action);
          this.addStep(state, 'observation', `Approval requested for ${action.toolId}.${action.operation}. Waiting...`);
          state.status = 'awaiting_approval';

          // In production, this would wait for approval callback
          // For now, we'll simulate waiting
          continue;
        }

        // Autonomous - execute immediately
        const result = await this.executeAction(action, task, state);
        this.addStep(state, 'action', `Executed ${action.toolId}.${action.operation}`);
        this.addStep(state, 'observation', this.formatObservation(result));
      }

      // 3. OBSERVATION: Already added in action phase

      // Check for completion conditions
      if (this.shouldTerminate(state, task)) {
        // Generate final answer
        const synthesis = await this.synthesizeAnswer(task, state);
        state.totalTokens += synthesis.tokens;
        state.totalCost += synthesis.cost;
        return synthesis.answer;
      }
    }

    // Max iterations reached
    const synthesis = await this.synthesizeAnswer(task, state);
    return `(Max iterations reached) ${synthesis.answer}`;
  }

  // ===========================================================================
  // THOUGHT GENERATION
  // ===========================================================================

  private async generateThought(
    task: AgentTask,
    state: AgentState
  ): Promise<{
    content: string;
    shouldFinish: boolean;
    finalAnswer?: string;
    tokens: number;
    cost: number;
  }> {
    const systemPrompt = this.buildThoughtPrompt(state.role);
    const userPrompt = this.buildThoughtUserPrompt(task, state);

    const response = await this.orchestrator.inference({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: this.config.maxTokensPerStep,
      task: 'reasoning',
    });

    const content = response.consensusContent;

    // Parse for finish signals
    const shouldFinish = content.toLowerCase().includes('final answer:') ||
                        content.toLowerCase().includes('task complete') ||
                        content.toLowerCase().includes('i now have enough information');

    let finalAnswer: string | undefined;
    if (shouldFinish) {
      const match = content.match(/final answer:\s*(.+)/is);
      finalAnswer = match ? match[1].trim() : content;
    }

    return {
      content,
      shouldFinish,
      finalAnswer,
      tokens: response.responses.reduce((sum, r) => sum + r.tokensInput + r.tokensOutput, 0),
      cost: response.totalCost,
    };
  }

  private buildThoughtPrompt(role: AgentRole): string {
    const rolePrompts: Record<AgentRole, string> = {
      planner: `You are a Planning Agent specializing in task decomposition.
Your job is to break down complex intelligence queries into smaller, manageable sub-tasks.
Think step by step about what information is needed and how to obtain it.`,

      researcher: `You are a Research Agent specializing in information gathering.
Your job is to gather relevant information using available tools.
Think carefully about which tools to use and what queries to make.
Available tools: graph_query, entity_lookup, threat_intel, document_search`,

      executor: `You are an Execution Agent specializing in performing actions.
Your job is to execute approved operations on the intelligence graph.
Be cautious with write operations - they require approval.`,

      synthesizer: `You are a Synthesis Agent specializing in combining information.
Your job is to take gathered information and produce coherent, actionable insights.`,
    };

    return `${rolePrompts[role]}

You follow the ReAct framework:
1. THOUGHT: Reason about the current state and what to do next
2. ACTION: Decide which tool to call with what parameters
3. OBSERVATION: Analyze the result of the action

Format your response as:
THOUGHT: [Your reasoning about the current state and next steps]
ACTION: [tool_name](param1="value1", param2="value2")

Or if you have enough information:
THOUGHT: [Your final reasoning]
FINAL ANSWER: [Your complete answer to the query]

Be concise but thorough. Always explain your reasoning.`;
  }

  private buildThoughtUserPrompt(task: AgentTask, state: AgentState): string {
    let prompt = `QUERY: ${task.query}\n\n`;

    if (task.context.investigation) {
      prompt += `INVESTIGATION: ${task.context.investigation.name} (Phase: ${task.context.investigation.phase})\n\n`;
    }

    if (task.context.extractedEntities.length > 0) {
      prompt += `RELEVANT ENTITIES:\n`;
      for (const entity of task.context.extractedEntities.slice(0, 10)) {
        prompt += `- ${entity.type}: ${entity.value}\n`;
      }
      prompt += '\n';
    }

    if (state.steps.length > 0) {
      prompt += `PREVIOUS STEPS:\n`;
      for (const step of state.steps.slice(-10)) {
        prompt += `${step.type.toUpperCase()}: ${step.content}\n`;
      }
      prompt += '\n';
    }

    prompt += `Iteration ${state.iteration}/${this.config.maxIterations}. What is your next step?`;

    return prompt;
  }

  // ===========================================================================
  // ACTION PARSING & EXECUTION
  // ===========================================================================

  private async parseActions(
    thought: string,
    task: AgentTask
  ): Promise<PendingAction[]> {
    const actions: PendingAction[] = [];

    // Parse ACTION: tool_name(params) format
    const actionRegex = /ACTION:\s*(\w+)\(([^)]*)\)/gi;
    let match;

    while ((match = actionRegex.exec(thought)) !== null) {
      const toolId = match[1];
      const paramsStr = match[2];

      // Parse parameters
      const params: Record<string, unknown> = {};
      const paramRegex = /(\w+)\s*=\s*"([^"]*)"/g;
      let paramMatch;

      while ((paramMatch = paramRegex.exec(paramsStr)) !== null) {
        params[paramMatch[1]] = paramMatch[2];
      }

      actions.push({
        id: uuidv4(),
        toolId,
        operation: 'invoke',
        parameters: params,
        riskLevel: 'autonomous', // Will be assessed later
      });
    }

    return actions;
  }

  private async assessRisk(
    action: PendingAction,
    securityContext: SecurityContext
  ): Promise<RiskLevel> {
    const tool = await this.toolRegistry.getTool(action.toolId);
    if (!tool) return 'prohibited';

    // Check tool's inherent risk level
    if (tool.metadata?.riskLevel === 'prohibited') {
      return 'prohibited';
    }

    // Check if operation requires approval
    const writeOps = ['create', 'update', 'delete', 'modify', 'execute'];
    const isWriteOp = writeOps.some(op =>
      action.operation.toLowerCase().includes(op) ||
      JSON.stringify(action.parameters).toLowerCase().includes(op)
    );

    if (isWriteOp) {
      return 'hitl';
    }

    // Check clearance vs data sensitivity
    // This would integrate with OPA in production

    return 'autonomous';
  }

  private async requestApproval(
    action: PendingAction,
    task: AgentTask,
    state: AgentState
  ): Promise<string> {
    const request = await this.approvalService.requestApproval({
      sessionId: task.sessionId,
      traceId: task.id,
      toolId: action.toolId,
      operation: action.operation,
      parameters: action.parameters,
      riskLevel: action.riskLevel,
      requesterId: task.securityContext.userId,
      reason: `Agent ${state.role} requested this action as part of task execution`,
    });

    return request.requestId;
  }

  private async executeAction(
    action: PendingAction,
    task: AgentTask,
    state: AgentState
  ): Promise<ToolInvocationResult> {
    const startTime = Date.now();

    try {
      const result = await this.toolRegistry.invoke(
        action.toolId,
        action.parameters,
        task.securityContext
      );

      const completed: CompletedAction = {
        ...action,
        result: result.result,
        success: result.success,
        latencyMs: Date.now() - startTime,
      };

      state.completedActions.push(completed);

      // Audit
      await this.auditService.record({
        eventType: 'tool_invoked',
        sessionId: task.sessionId,
        userId: task.securityContext.userId,
        tenantId: task.securityContext.tenantId,
        traceId: task.id,
        data: {
          toolId: action.toolId,
          operation: action.operation,
          parameters: action.parameters,
          success: result.success,
          latencyMs: completed.latencyMs,
        },
      });

      return result;
    } catch (error) {
      const completed: CompletedAction = {
        ...action,
        result: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        latencyMs: Date.now() - startTime,
      };

      state.completedActions.push(completed);

      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {},
      };
    }
  }

  private formatObservation(result: ToolInvocationResult): string {
    if (!result.success) {
      return `Error: ${result.error}`;
    }

    if (typeof result.result === 'string') {
      return result.result;
    }

    // Format complex results
    try {
      const json = JSON.stringify(result.result, null, 2);
      if (json.length > 2000) {
        return json.slice(0, 2000) + '\n... (truncated)';
      }
      return json;
    } catch {
      return String(result.result);
    }
  }

  // ===========================================================================
  // TERMINATION & SYNTHESIS
  // ===========================================================================

  private shouldTerminate(state: AgentState, task: AgentTask): boolean {
    // Check constraints
    if (task.context.constraints?.maxCost && state.totalCost >= task.context.constraints.maxCost) {
      return true;
    }

    if (task.context.constraints?.maxTime) {
      const elapsed = Date.now() - state.startTime.getTime();
      if (elapsed >= task.context.constraints.maxTime) {
        return true;
      }
    }

    // Check if we have enough successful observations
    const successfulActions = state.completedActions.filter(a => a.success);
    if (successfulActions.length >= 3 && state.iteration >= 3) {
      return true;
    }

    return false;
  }

  private async synthesizeAnswer(
    task: AgentTask,
    state: AgentState
  ): Promise<{ answer: string; tokens: number; cost: number }> {
    const systemPrompt = `You are a synthesis agent. Based on the gathered information, provide a clear, accurate, and actionable answer to the user's query.

Be concise but comprehensive. Cite specific findings from the observations.
If information is incomplete, acknowledge what is known and what requires further investigation.`;

    const observations = state.observations.map(o => o.content).join('\n\n');
    const completedActions = state.completedActions
      .filter(a => a.success)
      .map(a => `${a.toolId}: ${JSON.stringify(a.result).slice(0, 500)}`);

    const userPrompt = `ORIGINAL QUERY: ${task.query}

OBSERVATIONS:
${observations || 'No observations recorded.'}

TOOL RESULTS:
${completedActions.join('\n') || 'No tool results.'}

Please synthesize a comprehensive answer.`;

    const response = await this.orchestrator.inference({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: this.config.maxTokensPerStep,
      task: 'summarization',
    });

    return {
      answer: response.consensusContent,
      tokens: response.responses.reduce((sum, r) => sum + r.tokensInput + r.tokensOutput, 0),
      cost: response.totalCost,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private addStep(state: AgentState, type: ReActStep['type'], content: string): void {
    const step: ReActStep = {
      id: uuidv4(),
      type,
      content,
      timestamp: new Date(),
    };

    state.steps.push(step);

    if (type === 'observation') {
      state.observations.push({
        actionId: state.completedActions[state.completedActions.length - 1]?.id || '',
        content,
        timestamp: new Date(),
      });
    }
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  getActiveState(taskId: string): AgentState | undefined {
    return this.activeStates.get(taskId);
  }

  async cancelTask(taskId: string): Promise<void> {
    const state = this.activeStates.get(taskId);
    if (state) {
      state.status = 'failed';
      state.endTime = new Date();
      this.activeStates.delete(taskId);
      this.emit('trace:cancelled', { taskId });
    }
  }

  async resumeFromApproval(taskId: string, approved: boolean): Promise<void> {
    const state = this.activeStates.get(taskId);
    if (!state || state.status !== 'awaiting_approval') return;

    state.status = 'running';

    if (approved) {
      // Continue execution
      this.emit('trace:resumed', { taskId, approved: true });
    } else {
      // Mark pending action as denied
      const pendingAction = state.pendingActions.pop();
      if (pendingAction) {
        this.addStep(state, 'observation', `Action ${pendingAction.toolId} was denied by approver.`);
      }
      this.emit('trace:resumed', { taskId, approved: false });
    }
  }
}

// =============================================================================
// SPECIALIZED AGENTS
// =============================================================================

export class PlannerAgent extends ReActExecutor {
  async plan(query: string, context: AgentContext, securityContext: SecurityContext): Promise<string[]> {
    const task: AgentTask = {
      id: uuidv4(),
      sessionId: securityContext.sessionId,
      query: `Break down this query into sub-tasks: ${query}`,
      context,
      securityContext,
    };

    const result = await this.execute(task, 'planner');

    // Parse sub-tasks from result
    const subtasks: string[] = [];
    const lines = result.answer.split('\n');

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)/);
      if (match) {
        subtasks.push(match[1].trim());
      }
    }

    return subtasks.length > 0 ? subtasks : [query];
  }
}

export class ResearcherAgent extends ReActExecutor {
  async research(query: string, context: AgentContext, securityContext: SecurityContext): Promise<ExecutionResult> {
    const task: AgentTask = {
      id: uuidv4(),
      sessionId: securityContext.sessionId,
      query,
      context,
      securityContext,
    };

    return this.execute(task, 'researcher');
  }
}

export class ExecutorAgent extends ReActExecutor {
  async executeOperation(
    operation: string,
    parameters: Record<string, unknown>,
    context: AgentContext,
    securityContext: SecurityContext
  ): Promise<ExecutionResult> {
    const task: AgentTask = {
      id: uuidv4(),
      sessionId: securityContext.sessionId,
      query: `Execute operation: ${operation} with parameters: ${JSON.stringify(parameters)}`,
      context,
      securityContext,
    };

    return this.execute(task, 'executor');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createReActExecutor(config: AgentConfig): ReActExecutor {
  return new ReActExecutor(config);
}
