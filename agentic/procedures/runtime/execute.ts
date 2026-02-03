import type { ProcedurePlan } from '../types';

export type ProcedureExecutionContext = {
  actor: string;
  evidenceId: string;
};

export type ProcedureExecutionResult = {
  status: 'stubbed';
  executedSteps: number;
};

export function executePlan(
  plan: ProcedurePlan,
  context: ProcedureExecutionContext,
): ProcedureExecutionResult {
  return {
    status: 'stubbed',
    executedSteps: plan.steps.length,
  };
}
