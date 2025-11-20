export type Effect = 'allow' | 'deny';

export interface Decision {
  allowed: boolean;
  effect: Effect;
  policyId: string;
  evaluated: string;
  reason: string;
  matchedKey: string;
}

export interface RuleTrace {
  policyId: string;
  priority: number;
  effect: Effect;
  effectiveFrom: string;
  effectiveTo: string;
  matched: boolean;
  reason: string;
}

export interface Explanation {
  decision: Decision;
  chain: RuleTrace[];
}

export interface CompiledRule {
  policyId: string;
  action: string;
  jurisdiction: string;
  dataClass: string;
  purpose: string;
  effect: Effect;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string;
  conditions?: Record<string, string>;
  description?: string;
  overrides?: string[];
}

export interface CompiledEngine {
  version: string;
  generatedAt: string;
  defaultEffect: Effect;
  rules: CompiledRule[];
  index: Record<string, number[]>;
  etag: string;
  ttl: number;
  metadata?: Record<string, string>;
  dimensions?: Record<string, string[]>;
}

export interface EvaluationInput {
  action: string;
  jurisdiction: string;
  dataClass: string;
  purpose: string;
  decisionTime: Date;
  facts?: Record<string, string>;
  traits?: Record<string, string>;
}

