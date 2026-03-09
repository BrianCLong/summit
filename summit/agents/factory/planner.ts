import { FactoryPlan, ClaimRef } from './types';

export function createPlan(issueSlug: string, claims: ClaimRef[]): FactoryPlan {
  return {
    itemSlug: issueSlug,
    mws: "Plan generated successfully",
    workItems: []
  };
}
