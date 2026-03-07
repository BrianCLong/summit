import { FactoryPlan } from './types';

export function splitPlan(plan: FactoryPlan) {
  return plan.workItems;
}
