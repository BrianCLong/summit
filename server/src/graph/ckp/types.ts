export interface PlanStep {
  id: string;
  description: string;
  operation: 'query' | 'filter' | 'summarize' | 'risk_check';
  params: Record<string, any>; // e.g., Cypher query template, LLM prompt
}

export interface KnowledgePlan {
  id: string;
  name: string;
  description: string;
  steps: PlanStep[];
  version: number;
}

export interface PlanResult {
  planId: string;
  runId: string;
  timestamp: string;
  artifacts: Record<string, any>;
  summary?: string;
}
