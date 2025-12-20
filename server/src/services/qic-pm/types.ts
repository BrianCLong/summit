export type QueryIntent =
  | 'analytics'
  | 'marketing'
  | 'support'
  | 'fraud'
  | 'research'
  | 'unknown';

export type PolicyAction = 'allow' | 'redact' | 'deny' | 'transform';

export interface QueryContext {
  channel?: string;
  locale?: string;
  tenantId?: string;
  userRole?: string;
  region?: string;
  tags?: string[];
  sensitivity?: 'low' | 'medium' | 'high';
  [key: string]: unknown;
}

export interface ExplanationStep {
  stage: 'rule' | 'model' | 'policy';
  description: string;
  intent: QueryIntent;
  confidence?: number;
  details?: Record<string, unknown>;
}

export interface ClassificationResult {
  intent: QueryIntent;
  confidence: number;
  probabilities: Record<QueryIntent, number>;
  explanation: ExplanationStep[];
}

export interface PolicyDecision {
  action: PolicyAction;
  policyId: string;
  rationale: string;
  obligations?: string[];
  transforms?: string[];
  redactFields?: string[];
}

export interface PolicyDecisionResult extends ClassificationResult {
  decision: PolicyDecision;
}
