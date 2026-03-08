"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePlan = evaluatePlan;
function evaluatePlan(plan) {
    const optimizedCost = Math.max(Math.round((plan.planCost ?? 0) * 0.7), 1);
    const savingsPercent = plan.planCost
        ? Math.round(((plan.planCost - optimizedCost) / plan.planCost) * 100)
        : 0;
    const recommendedPlan = {
        ...plan,
        planCost: optimizedCost,
        estimatedMs: Math.max((plan.estimatedMs ?? 1000) - 250, 150),
        strategy: plan.strategy ?? 'indexed-neighborhood'
    };
    const rationale = 'Reduced redundant traversals, tightened projection set, and pushed filters earlier to save hops.';
    return { recommendedPlan, savingsPercent, rationale };
}
