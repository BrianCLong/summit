import type {
  LedgerFactInput,
  PolicyEvaluationResult,
  PolicyObligation,
  WorkOrderResult,
  WorkOrderStatus,
  WorkOrderSubmission,
  WorkTaskInput,
  WorkTaskResult,
  WorkTaskStatus,
  WorkcellAgentDefinition,
  WorkcellToolDefinition,
  WorkcellToolHandlerContext,
} from 'common-types';
import { PolicyEngine } from 'policy';
import { ProvenanceLedger } from 'prov-ledger';

export interface WorkcellRuntimeOptions {
  policy: PolicyEngine;
  ledger: ProvenanceLedger;
  tools?: WorkcellToolDefinition[];
  agents?: WorkcellAgentDefinition[];
}

function normaliseOutput(
  output: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (output && typeof output === 'object') {
    return output;
  }
  return {};
}

function deriveOrderStatus(results: WorkTaskResult[]): WorkOrderStatus {
  if (results.length === 0) {
    return 'completed';
  }

  const statuses = results.map((result) => result.status);
  if (statuses.every((status) => status === 'success')) {
    return 'completed';
  }
  if (statuses.every((status) => status === 'rejected')) {
    return 'rejected';
  }
  return 'partial';
}

export class WorkcellRuntime {
  private readonly policy: PolicyEngine;

  private readonly ledger: ProvenanceLedger;

  private readonly tools = new Map<string, WorkcellToolDefinition>();

  private readonly agents = new Map<string, WorkcellAgentDefinition>();

  private readonly orders: WorkOrderResult[] = [];

  constructor(options: WorkcellRuntimeOptions) {
    this.policy = options.policy;
    this.ledger = options.ledger;

    if (options.tools) {
      for (const tool of options.tools) {
        this.registerTool(tool);
      }
    }
    if (options.agents) {
      for (const agent of options.agents) {
        this.registerAgent(agent);
      }
    }
  }

  registerTool(tool: WorkcellToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  registerAgent(agent: WorkcellAgentDefinition): void {
    this.agents.set(agent.name, agent);
  }

  listOrders(): WorkOrderResult[] {
    return [...this.orders];
  }

  async submitOrder(order: WorkOrderSubmission): Promise<WorkOrderResult> {
    const agent = this.agents.get(order.agentName);
    if (!agent) {
      throw new Error(`unknown agent ${order.agentName}`);
    }

    const startedAt = new Date();
    const taskResults: WorkTaskResult[] = [];
    const obligations: PolicyObligation[] = [];
    const reasons: string[] = [];

    for (const task of order.tasks) {
      const evaluation = this.policy.evaluate({
        action: task.action,
        resource: task.resource,
        context: {
          tenantId: order.tenantId,
          userId: order.userId,
          roles: order.roles,
          region: order.region,
          attributes: order.attributes,
        },
      });

      reasons.push(...evaluation.reasons);
      if (evaluation.obligations.length > 0) {
        obligations.push(...evaluation.obligations);
      }

      const result = await this.executeTask(order, agent, task, evaluation);
      taskResults.push(result);
    }

    const finishedAt = new Date();
    const status = deriveOrderStatus(taskResults);
    const summary: WorkOrderResult = {
      orderId: order.orderId,
      submittedBy: order.submittedBy,
      agentName: order.agentName,
      tenantId: order.tenantId,
      status,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      tasks: taskResults,
      obligations,
      reasons,
    };

    this.appendLedger({
      id: `${order.orderId}:summary:${finishedAt.getTime()}`,
      category: 'workcell-order',
      actor: order.submittedBy,
      action: `order.${status}`,
      resource: order.agentName,
      payload: {
        orderId: order.orderId,
        tenantId: order.tenantId,
        status,
        tasks: taskResults.map((result) => ({
          taskId: result.taskId,
          status: result.status,
        })),
        obligations,
        reasons,
      },
    });

    this.orders.push(summary);
    return summary;
  }

  private async executeTask(
    order: WorkOrderSubmission,
    agent: WorkcellAgentDefinition,
    task: WorkTaskInput,
    evaluation: PolicyEvaluationResult,
  ): Promise<WorkTaskResult> {
    const logs: string[] = [];
    let status: WorkTaskStatus = 'rejected';
    let output: Record<string, unknown> = {};

    if (!evaluation.allowed) {
      logs.push(
        `policy denied task ${task.taskId}: ${evaluation.reasons.join('; ')}`,
      );
      this.appendTaskLedger(order, task, 'rejected', logs, evaluation, output);
      return { taskId: task.taskId, status: 'rejected', logs, output };
    }

    const tool = this.tools.get(task.tool);
    if (!tool) {
      logs.push(`tool ${task.tool} is not registered`);
      this.appendTaskLedger(order, task, 'rejected', logs, evaluation, output);
      return { taskId: task.taskId, status: 'rejected', logs, output };
    }

    if (!agent.allowedTools.includes(task.tool)) {
      logs.push(`agent ${agent.name} is not permitted to use ${task.tool}`);
      this.appendTaskLedger(order, task, 'rejected', logs, evaluation, output);
      return { taskId: task.taskId, status: 'rejected', logs, output };
    }

    const requiredAuthority =
      task.requiredAuthority ?? tool.minimumAuthority ?? 0;
    if (agent.authority < requiredAuthority) {
      logs.push(`agent ${agent.name} lacks authority for ${task.tool}`);
      this.appendTaskLedger(order, task, 'rejected', logs, evaluation, output);
      return { taskId: task.taskId, status: 'rejected', logs, output };
    }

    try {
      const context: WorkcellToolHandlerContext = {
        orderId: order.orderId,
        taskId: task.taskId,
        tenantId: order.tenantId,
        userId: order.userId,
        agentName: agent.name,
        metadata: order.metadata,
      };
      const handlerOutput = await Promise.resolve(tool.handler(task, context));
      output = normaliseOutput(
        handlerOutput as Record<string, unknown> | undefined,
      );
      status = 'success';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logs.push(`execution failure: ${message}`);
      status = 'failed';
      output = {};
    }

    this.appendTaskLedger(order, task, status, logs, evaluation, output);
    return { taskId: task.taskId, status, logs, output };
  }

  private appendTaskLedger(
    order: WorkOrderSubmission,
    task: WorkTaskInput,
    status: WorkTaskStatus,
    logs: string[],
    evaluation: PolicyEvaluationResult,
    output: Record<string, unknown>,
  ) {
    const entry: LedgerFactInput = {
      id: `${order.orderId}:${task.taskId}:${Date.now()}`,
      category: 'workcell-task',
      actor: order.submittedBy,
      action: `task.${status}`,
      resource: task.tool,
      payload: {
        orderId: order.orderId,
        taskId: task.taskId,
        status,
        logs,
        output,
        policy: {
          allowed: evaluation.allowed,
          reasons: evaluation.reasons,
          obligations: evaluation.obligations,
        },
      },
    };
    this.appendLedger(entry);
  }

  private appendLedger(entry: LedgerFactInput): void {
    this.ledger.append(entry);
  }
}

export type {
  WorkOrderSubmission,
  WorkOrderResult,
  WorkTaskInput,
  WorkTaskResult,
  WorkcellAgentDefinition,
  WorkcellToolDefinition,
} from 'common-types';
