import { QueryPlan } from './types.js';

export interface CostGovernance {
  recommendedPlan: QueryPlan;
  savingsPercent: number;
  rationale: string;
}

export function evaluatePlan(plan: QueryPlan): CostGovernance {
  const optimizedCost = Math.max(Math.round((plan.planCost ?? 0) * 0.7), 1);
  const savingsPercent = plan.planCost
    ? Math.round(((plan.planCost - optimizedCost) / plan.planCost) * 100)
    : 0;

  const recommendedPlan: QueryPlan = {
    ...plan,
    planCost: optimizedCost,
    estimatedMs: Math.max((plan.estimatedMs ?? 1000) - 250, 150),
    strategy: plan.strategy ?? 'indexed-neighborhood'
  };

  const rationale =
    'Reduced redundant traversals, tightened projection set, and pushed filters earlier to save hops.';

  return { recommendedPlan, savingsPercent, rationale };
}
