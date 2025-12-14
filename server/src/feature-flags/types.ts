export interface FeatureFlagContext {
  userId?: string;
  tenantId?: string;
  roles?: string[];
  scopes?: string[];
  source?: string;
  module?: string;
  ip?: string;
  correlationId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  environment?: string;
  metadata?: Record<string, any>;
}

export interface FeatureFlagDecision {
  flag: string;
  enabled: boolean;
  reason?: string;
  killSwitchActive?: boolean;
  audit?: Record<string, any>;
  evaluationId: string;
  evaluatedAt: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface KillSwitchDecision {
  module: string;
  active: boolean;
  reason?: string;
  audit?: Record<string, any>;
  evaluationId: string;
  evaluatedAt: string;
}

export interface FeatureFlagEvaluationResult {
  decision: FeatureFlagDecision;
  raw: any;
}

export interface KillSwitchResult {
  decision: KillSwitchDecision;
  raw: any;
}
