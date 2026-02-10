export type AtfLevel = "intern" | "junior" | "senior" | "principal";

export interface GovernanceManifest {
  identity: {
    id: string;
    level: AtfLevel;
    created_at: string;
    promoted_at?: string;
  };
  capabilities: {
    canExecuteActions: boolean;
    canProposeActions: boolean;
    requiresApproval: boolean;
    maxBudget?: number;
  };
}

export interface PromotionCriteria {
  minSuccessRate: number;
  minTasksCompleted: number;
  minTimeAtLevelDays: number;
  recommendationAcceptanceRate?: number;
}
