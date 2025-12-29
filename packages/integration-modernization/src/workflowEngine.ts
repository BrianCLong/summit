import { randomUUID } from 'crypto';
import { AuditEntry, WorkflowInstance, WorkflowStep } from './types';

export type ConcurrencyBudget = {
  tenantId: string;
  limit: number;
};

export class WorkflowEngine {
  private workflows: Map<string, WorkflowInstance> = new Map();
  private deadLetter: WorkflowInstance[] = [];
  private auditLog: AuditEntry[] = [];
  private budgets: Map<string, number> = new Map();
  private concurrencyLimits: Map<string, number> = new Map();

  constructor(concurrencyBudgets: ConcurrencyBudget[]) {
    concurrencyBudgets.forEach((budget) => this.concurrencyLimits.set(budget.tenantId, budget.limit));
  }

  startWorkflow(tenantId: string, steps: WorkflowStep[], payload: Record<string, unknown>): WorkflowInstance {
    const limit = this.concurrencyLimits.get(tenantId) ?? 1;
    const active = [...this.workflows.values()].filter(
      (workflow) => workflow.tenantId === tenantId && workflow.state === 'running'
    ).length;
    if (active >= limit) {
      throw new Error('Concurrency limit exceeded for tenant');
    }
    const instance: WorkflowInstance = {
      id: randomUUID(),
      tenantId,
      steps,
      cursor: 0,
      state: 'running',
      history: [],
      payload
    };
    this.workflows.set(instance.id, instance);
    this.audit(instance.id, 'start', payload);
    return instance;
  }

  async run(instanceId: string) {
    const workflow = this.workflows.get(instanceId);
    if (!workflow) throw new Error(`Workflow ${instanceId} not found`);

    while (workflow.cursor < workflow.steps.length) {
      const step = workflow.steps[workflow.cursor];
      if (step.approval?.required && !step.approval.approvedBy) {
        workflow.state = 'paused';
        this.audit(instanceId, 'awaiting_approval', { stepId: step.id });
        return workflow;
      }
      try {
        workflow.state = 'running';
        const result = await step.execute(workflow.payload);
        workflow.payload = { ...workflow.payload, ...result };
        workflow.history.push({
          id: randomUUID(),
          actor: 'system',
          action: `step:${step.id}:success`,
          timestamp: Date.now(),
          details: result
        });
        workflow.cursor += 1;
      } catch (error) {
        const attempts = step.maxAttempts ?? 3;
        const currentAttempts = this.countAttempts(workflow, step.id);
        if (currentAttempts >= attempts) {
          workflow.state = 'failed';
          this.deadLetter.push(workflow);
          this.audit(instanceId, 'dead_lettered', { step: step.id, error: (error as Error).message });
          return workflow;
        }
        this.audit(instanceId, 'retrying', { step: step.id, attempt: currentAttempts + 1 });
      }
    }
    workflow.state = 'completed';
    this.audit(instanceId, 'completed', workflow.payload);
    return workflow;
  }

  approve(instanceId: string, stepId: string, actor: string) {
    const workflow = this.workflows.get(instanceId);
    if (!workflow) throw new Error('Workflow not found');
    const step = workflow.steps.find((current) => current.id === stepId);
    if (!step || !step.approval?.required) throw new Error('Approval not required');
    step.approval.approvedBy = actor;
    step.approval.approvedAt = Date.now();
    workflow.state = 'running';
    this.audit(instanceId, 'approved', { stepId, actor });
  }

  replay(instanceId: string) {
    const workflow = this.workflows.get(instanceId);
    if (!workflow) throw new Error('Workflow not found');
    workflow.cursor = 0;
    workflow.state = 'pending';
    this.audit(instanceId, 'replay_requested', {});
  }

  dlq() {
    return [...this.deadLetter];
  }

  private audit(instanceId: string, action: string, details: Record<string, unknown>) {
    this.auditLog.push({ id: randomUUID(), actor: 'system', action, timestamp: Date.now(), details: { ...details, instanceId } });
  }

  private countAttempts(workflow: WorkflowInstance, stepId: string) {
    return workflow.history.filter((entry) => entry.action === `step:${stepId}:success`).length;
  }

  auditEntries() {
    return [...this.auditLog];
  }
}
