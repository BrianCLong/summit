
export type OptimizationDomain =
  | 'cost'
  | 'performance'
  | 'reliability'
  | 'policy'
  | 'autonomy';

export type PriorityClass =
  | 'critical'   // Policy, Security, Critical SLAs
  | 'high'       // Primary optimization targets
  | 'normal'     // Standard operations
  | 'background'; // Cleanup, non-urgent

export interface Intent {
  id: string;
  domain: OptimizationDomain;
  priority: PriorityClass;
  tier?: number; // 0 = Advisory, 1-2 = Coordinated, 3+ = Strict
  objective: string; // e.g., "Minimize Cost"
  protectedMetrics: {
    metricName: string;
    threshold: number;
    operator: '<' | '>' | '<=' | '>=' | '=';
  }[];
  allowedTradeoffs: string[]; // List of metrics that can be degraded
  timestamp: number;
}

export type DecisionOutcome = 'proceed' | 'suppress' | 'modify';

export interface CoordinationDecision {
  decisionId: string;
  intentId: string;
  timestamp: number;
  outcome: DecisionOutcome;
  reason: string;
  arbitrationRuleApplied?: string;
  conflictingIntents?: string[]; // IDs of conflicting intents
  isAdvisory?: boolean;
}

export interface ProposedAction {
  intentId: string;
  actionType: string;
  parameters: Record<string, any>;
  predictedImpact: {
    metricName: string;
    changeDirection: 'increase' | 'decrease';
    estimatedMagnitude?: number;
  }[];
}
