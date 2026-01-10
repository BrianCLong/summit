import { ExecutionGuardrail, PlanContext, RunResult, StepResult } from './types.js';

export interface RunTrace extends RunResult {
  planSnapshot: unknown;
  planContext?: PlanContext;
  guardrails?: ExecutionGuardrail[];
  provenance?: string[];
  approvals: { stepId: string; approvedBy: string; approvedAt: string }[];
  policyDecisions: { stepId: string; action: string; reason?: string; mode?: string }[];
}

export class InMemoryRunTraceStore {
  private runs = new Map<string, RunTrace>();

  save(trace: RunTrace): void {
    this.runs.set(trace.runId, trace);
  }

  appendStepResult(runId: string, result: StepResult): void {
    const existing = this.runs.get(runId);
    if (!existing) return;
    existing.steps = existing.steps.map((step) =>
      step.stepId === result.stepId ? { ...step, ...result } : step,
    );
    this.runs.set(runId, existing);
  }

  addApproval(runId: string, approval: { stepId: string; approvedBy: string; approvedAt: string }): void {
    const existing = this.runs.get(runId);
    if (!existing) return;
    existing.approvals.push(approval);
    this.runs.set(runId, existing);
  }

  all(): RunTrace[] {
    return Array.from(this.runs.values());
  }

  get(runId: string): RunTrace | undefined {
    return this.runs.get(runId);
  }
}
