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

// Interfaces copied from packages/feature-flags/src/types.ts for compatibility
export interface FlagContext {
  userId?: string;
  userEmail?: string;
  userRole?: string | string[];
  tenantId?: string;
  environment?: string;
  attributes?: Record<string, any>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export type FlagVariation = string | number | boolean | object;

export interface FlagEvaluation<T = FlagVariation> {
  key: string;
  value: T;
  variation?: string;
  exists: boolean;
  reason?: EvaluationReason;
  timestamp: number;
  fromCache?: boolean;
}

export type EvaluationReason =
  | 'TARGET_MATCH'
  | 'RULE_MATCH'
  | 'DEFAULT'
  | 'OFF'
  | 'PREREQUISITE_FAILED'
  | 'ERROR'
  | 'FALLBACK';

export interface FlagDefinition {
  key: string;
  name: string;
  description?: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  enabled: boolean;
  defaultValue: FlagVariation;
  variations: FlagVariationDefinition[];
  rules?: TargetingRule[];
  rollout?: PercentageRollout;
  prerequisites?: Prerequisite[];
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface FlagVariationDefinition {
  id: string;
  name: string;
  value: FlagVariation;
  description?: string;
}

export interface TargetingRule {
  id: string;
  description?: string;
  conditions: Condition[];
  variation: string;
  rollout?: PercentageRollout;
}

export interface Condition {
  attribute: string;
  operator: ConditionOperator;
  value: any;
  negate?: boolean;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'matches_regex'
  | 'semver_equal'
  | 'semver_greater_than'
  | 'semver_less_than';

export interface PercentageRollout {
  type: 'percentage' | 'ab_test';
  variations: RolloutVariation[];
  bucketBy?: string;
  seed?: number;
}

export interface RolloutVariation {
  variation: string;
  percentage: number;
  weight?: number;
}

export interface Prerequisite {
  flagKey: string;
  variation: string;
}

export interface FeatureFlagProvider {
  name: string;
  initialize(): Promise<void>;
  close(): Promise<void>;
  isReady(): boolean;
  getBooleanFlag(
    key: string,
    defaultValue: boolean,
    context: FlagContext,
  ): Promise<FlagEvaluation<boolean>>;
  getStringFlag(
    key: string,
    defaultValue: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<string>>;
  getNumberFlag(
    key: string,
    defaultValue: number,
    context: FlagContext,
  ): Promise<FlagEvaluation<number>>;
  getJSONFlag<T = any>(
    key: string,
    defaultValue: T,
    context: FlagContext,
  ): Promise<FlagEvaluation<T>>;
  getAllFlags(context: FlagContext): Promise<Record<string, FlagEvaluation>>;
  getFlagDefinition(key: string): Promise<FlagDefinition | null>;
  listFlags(): Promise<FlagDefinition[]>;
  track(
    eventName: string,
    context: FlagContext,
    data?: Record<string, any>,
  ): Promise<void>;
}
