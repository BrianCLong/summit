import { ChainConfig, LLMRequest } from '../types/index.js';
import { PlanIR, PlanIRSchema, PlanStepIR } from './types.js';

export function buildPlanFromChain(
  chain: ChainConfig,
  context: {
    runId: string;
    goal: string;
  },
): PlanIR {
  const steps: PlanStepIR[] = chain.steps.map((step) => ({
    step_id: step.id,
    name: step.name,
    tool_name: step.provider ? `llm:${step.provider}` : undefined,
    args_schema_ref: step.model ? `llm.request.${step.model}` : 'llm.request',
    preconditions: step.dependsOn ?? [],
    postconditions: step.validate ? ['output_validated'] : [],
    permissions: [],
    cost_bounds: chain.budget
      ? {
          max_cost_usd: chain.budget.maxRequestCostUSD,
          max_tokens: undefined,
        }
      : undefined,
    retry_policy: {
      max_retries: step.retries ?? chain.maxRetries,
    },
  }));

  return PlanIRSchema.parse({
    plan_id: chain.id,
    run_id: context.runId,
    goal: context.goal,
    steps,
  });
}

export function buildPlanFromRequest(
  request: LLMRequest,
  context: {
    runId: string;
    planId: string;
    goal: string;
  },
): PlanIR {
  const step: PlanStepIR = {
    step_id: context.planId,
    name: 'single-completion',
    tool_name: request.model ? `llm:${request.model}` : 'llm',
    args_schema_ref: request.model ? `llm.request.${request.model}` : 'llm.request',
    preconditions: [],
    postconditions: [],
    permissions: [],
  };

  return PlanIRSchema.parse({
    plan_id: context.planId,
    run_id: context.runId,
    goal: context.goal,
    steps: [step],
  });
}
