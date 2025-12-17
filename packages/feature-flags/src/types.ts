/**
 * Feature Flag Types
 *
 * Core type definitions for the feature flag system
 */

/**
 * Feature flag evaluation context
 */
export interface FlagContext {
  /** User ID */
  userId?: string;
  /** User email */
  userEmail?: string;
  /** User role(s) */
  userRole?: string | string[];
  /** Tenant/Organization ID */
  tenantId?: string;
  /** Environment (production, staging, development) */
  environment?: string;
  /** Custom attributes for targeting */
  attributes?: Record<string, any>;
  /** Session ID */
  sessionId?: string;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Geographic location */
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

/**
 * Feature flag variation types
 */
export type FlagVariation = string | number | boolean | object;

/**
 * Feature flag evaluation result
 */
export interface FlagEvaluation<T = FlagVariation> {
  /** Flag key */
  key: string;
  /** Evaluated value */
  value: T;
  /** Variation ID/name */
  variation?: string;
  /** Whether the flag was found */
  exists: boolean;
  /** Reason for the evaluation result */
  reason?: EvaluationReason;
  /** Timestamp of evaluation */
  timestamp: number;
  /** Whether result came from cache */
  fromCache?: boolean;
}

/**
 * Reason for flag evaluation result
 */
export type EvaluationReason =
  | 'TARGET_MATCH' // User matched a targeting rule
  | 'RULE_MATCH' // Matched a percentage rollout rule
  | 'DEFAULT' // Default value
  | 'OFF' // Flag is off
  | 'PREREQUISITE_FAILED' // Prerequisite flag not met
  | 'ERROR' // Error during evaluation
  | 'FALLBACK'; // Fallback value used

/**
 * Feature flag definition
 */
export interface FlagDefinition {
  /** Unique flag key */
  key: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Flag type */
  type: 'boolean' | 'string' | 'number' | 'json';
  /** Whether flag is enabled */
  enabled: boolean;
  /** Default value when flag is off */
  defaultValue: FlagVariation;
  /** Available variations */
  variations: FlagVariationDefinition[];
  /** Targeting rules */
  rules?: TargetingRule[];
  /** Percentage rollout configuration */
  rollout?: PercentageRollout;
  /** Prerequisites */
  prerequisites?: Prerequisite[];
  /** Tags for organization */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, any>;
  /** Created timestamp */
  createdAt?: number;
  /** Updated timestamp */
  updatedAt?: number;
  /** Created by */
  createdBy?: string;
  /** Updated by */
  updatedBy?: string;
}

/**
 * Flag variation definition
 */
export interface FlagVariationDefinition {
  /** Variation ID */
  id: string;
  /** Variation name */
  name: string;
  /** Variation value */
  value: FlagVariation;
  /** Description */
  description?: string;
}

/**
 * Targeting rule for user segmentation
 */
export interface TargetingRule {
  /** Rule ID */
  id: string;
  /** Rule description */
  description?: string;
  /** Conditions that must be met */
  conditions: Condition[];
  /** Variation to serve if conditions match */
  variation: string;
  /** Percentage rollout within this rule */
  rollout?: PercentageRollout;
}

/**
 * Condition for targeting
 */
export interface Condition {
  /** Attribute to evaluate */
  attribute: string;
  /** Operator */
  operator: ConditionOperator;
  /** Value(s) to compare against */
  value: any;
  /** Negate the condition */
  negate?: boolean;
}

/**
 * Condition operators
 */
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

/**
 * Percentage rollout configuration
 */
export interface PercentageRollout {
  /** Type of rollout */
  type: 'percentage' | 'ab_test';
  /** Variations with their percentages */
  variations: RolloutVariation[];
  /** Attribute to use for bucketing (default: userId) */
  bucketBy?: string;
  /** Seed for consistent hashing */
  seed?: number;
}

/**
 * Rollout variation with percentage
 */
export interface RolloutVariation {
  /** Variation ID */
  variation: string;
  /** Percentage (0-100) */
  percentage: number;
  /** Weight (alternative to percentage) */
  weight?: number;
}

/**
 * Prerequisite flag requirement
 */
export interface Prerequisite {
  /** Flag key that must be met */
  flagKey: string;
  /** Required variation */
  variation: string;
}

/**
 * Feature flag provider interface
 */
export interface FeatureFlagProvider {
  /** Provider name */
  name: string;

  /** Initialize the provider */
  initialize(): Promise<void>;

  /** Shutdown the provider */
  close(): Promise<void>;

  /** Check if provider is ready */
  isReady(): boolean;

  /** Evaluate a boolean flag */
  getBooleanFlag(
    key: string,
    defaultValue: boolean,
    context: FlagContext,
  ): Promise<FlagEvaluation<boolean>>;

  /** Evaluate a string flag */
  getStringFlag(
    key: string,
    defaultValue: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<string>>;

  /** Evaluate a number flag */
  getNumberFlag(
    key: string,
    defaultValue: number,
    context: FlagContext,
  ): Promise<FlagEvaluation<number>>;

  /** Evaluate a JSON flag */
  getJSONFlag<T = any>(
    key: string,
    defaultValue: T,
    context: FlagContext,
  ): Promise<FlagEvaluation<T>>;

  /** Get all flag values for context */
  getAllFlags(context: FlagContext): Promise<Record<string, FlagEvaluation>>;

  /** Get flag definition */
  getFlagDefinition(key: string): Promise<FlagDefinition | null>;

  /** List all flags */
  listFlags(): Promise<FlagDefinition[]>;

  /** Track an event/metric */
  track(
    eventName: string,
    context: FlagContext,
    data?: Record<string, any>,
  ): Promise<void>;
}

/**
 * Cache interface for flag evaluation results
 */
export interface FlagCache {
  /** Get cached evaluation */
  get<T = FlagVariation>(
    key: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<T> | null>;

  /** Set cached evaluation */
  set<T = FlagVariation>(
    key: string,
    context: FlagContext,
    evaluation: FlagEvaluation<T>,
    ttl?: number,
  ): Promise<void>;

  /** Delete cached evaluation */
  delete(key: string, context?: FlagContext): Promise<void>;

  /** Clear all cache */
  clear(): Promise<void>;

  /** Get cache statistics */
  getStats(): Promise<CacheStats>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Feature flag service configuration
 */
export interface FeatureFlagConfig {
  /** Provider to use */
  provider: FeatureFlagProvider;

  /** Cache implementation */
  cache?: FlagCache;

  /** Cache TTL in seconds */
  cacheTTL?: number;

  /** Enable cache */
  enableCache?: boolean;

  /** Enable analytics */
  enableAnalytics?: boolean;

  /** Enable metrics */
  enableMetrics?: boolean;

  /** Default context values */
  defaultContext?: Partial<FlagContext>;

  /** Offline mode */
  offline?: boolean;

  /** Bootstrap flags (for offline mode) */
  bootstrap?: Record<string, FlagDefinition>;
}

/**
 * Analytics event for flag evaluation
 */
export interface FlagAnalyticsEvent {
  /** Event type */
  type: 'evaluation' | 'track';
  /** Flag key */
  flagKey: string;
  /** Evaluated value */
  value?: FlagVariation;
  /** Variation */
  variation?: string;
  /** Context */
  context: FlagContext;
  /** Timestamp */
  timestamp: number;
  /** Evaluation reason */
  reason?: EvaluationReason;
  /** Custom event data (for track events) */
  data?: Record<string, any>;
}

/**
 * Metrics interface
 */
export interface FlagMetrics {
  /** Record flag evaluation */
  recordEvaluation(
    flagKey: string,
    variation: string,
    duration: number,
  ): void;

  /** Record cache hit */
  recordCacheHit(flagKey: string): void;

  /** Record cache miss */
  recordCacheMiss(flagKey: string): void;

  /** Record error */
  recordError(flagKey: string, error: Error): void;

  /** Get metrics registry (for Prometheus) */
  getRegistry(): any;
}
