export interface QueryPlan {
  queryId?: string;
  planCost?: number;
  estimatedMs?: number;
  safeConcurrency?: number;
  expectedInsights?: number;
  strategy?: string;
}

export interface ChaosDrillRun {
  scenario: string;
  followUpTasks: string[];
  lessonsLearned: string[];
  outcome: 'pass' | 'degraded' | 'recovered';
  sloDelta: number;
  timestamp: number;
}
