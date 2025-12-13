/**
 * Privacy-Preserving Analytics Service - Core Type Definitions
 *
 * This module defines all types for aggregate queries, privacy policies,
 * execution results, and governance integration.
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Supported aggregation functions - restricted to privacy-safe operations
 */
export const AggregationType = {
  COUNT: 'count',
  COUNT_DISTINCT: 'count_distinct',
  SUM: 'sum',
  AVG: 'avg',
  MIN: 'min',
  MAX: 'max',
  MEDIAN: 'median',
  PERCENTILE: 'percentile',
  STDDEV: 'stddev',
  VARIANCE: 'variance',
} as const;

export type AggregationType = (typeof AggregationType)[keyof typeof AggregationType];

/**
 * Filter operators for query conditions
 */
export const FilterOperator = {
  EQUALS: 'eq',
  NOT_EQUALS: 'neq',
  GREATER_THAN: 'gt',
  GREATER_THAN_OR_EQUAL: 'gte',
  LESS_THAN: 'lt',
  LESS_THAN_OR_EQUAL: 'lte',
  IN: 'in',
  NOT_IN: 'not_in',
  LIKE: 'like',
  IS_NULL: 'is_null',
  IS_NOT_NULL: 'is_not_null',
  BETWEEN: 'between',
} as const;

export type FilterOperator = (typeof FilterOperator)[keyof typeof FilterOperator];

/**
 * Time granularity for time-series aggregations
 */
export const TimeGranularity = {
  MINUTE: 'minute',
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
} as const;

export type TimeGranularity = (typeof TimeGranularity)[keyof typeof TimeGranularity];

/**
 * Data sources available for querying
 */
export const DataSource = {
  ENTITIES: 'entities',
  RELATIONSHIPS: 'relationships',
  CASES: 'cases',
  EVENTS: 'events',
  AUDIT_LOG: 'audit_log',
  USER_ACTIVITY: 'user_activity',
} as const;

export type DataSource = (typeof DataSource)[keyof typeof DataSource];

/**
 * Privacy mechanism types
 */
export const PrivacyMechanism = {
  NONE: 'none',
  K_ANONYMITY: 'k_anonymity',
  DIFFERENTIAL_PRIVACY: 'differential_privacy',
  SUPPRESSION: 'suppression',
  GENERALIZATION: 'generalization',
  COMBINED: 'combined',
} as const;

export type PrivacyMechanism = (typeof PrivacyMechanism)[keyof typeof PrivacyMechanism];

/**
 * Query result status
 */
export const QueryStatus = {
  SUCCESS: 'success',
  SUPPRESSED: 'suppressed',
  PARTIAL: 'partial',
  DENIED: 'denied',
  ERROR: 'error',
} as const;

export type QueryStatus = (typeof QueryStatus)[keyof typeof QueryStatus];

// ============================================================================
// Filter and Dimension Types
// ============================================================================

/**
 * A single filter condition
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
  /** Optional second value for BETWEEN operator */
  valueTo?: unknown;
}

/**
 * A logical grouping of filter conditions
 */
export interface FilterGroup {
  logic: 'AND' | 'OR';
  conditions: Array<FilterCondition | FilterGroup>;
}

/**
 * A dimension to group by in the aggregate query
 */
export interface Dimension {
  /** The field to group by */
  field: string;
  /** Optional alias for the output */
  alias?: string;
  /** For date fields, the time granularity */
  timeGranularity?: TimeGranularity;
  /** For numeric fields, optional binning configuration */
  bins?: {
    count: number;
    min?: number;
    max?: number;
  };
}

/**
 * A measure to compute in the aggregate query
 */
export interface Measure {
  /** The field to aggregate */
  field: string;
  /** The aggregation function */
  aggregation: AggregationType;
  /** Optional alias for the output */
  alias?: string;
  /** For percentile aggregation, the percentile value (0-100) */
  percentile?: number;
}

// ============================================================================
// Aggregate Query Definition
// ============================================================================

/**
 * Time range specification
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * The main aggregate query structure
 */
export interface AggregateQuery {
  /** Unique query identifier */
  id?: string;
  /** Data source to query */
  source: DataSource;
  /** Dimensions to group by */
  dimensions: Dimension[];
  /** Measures to compute */
  measures: Measure[];
  /** Filter conditions */
  filters?: FilterGroup;
  /** Time range for the query */
  timeRange?: TimeRange;
  /** Maximum number of result rows */
  limit?: number;
  /** Ordering of results */
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  /** Whether to include null dimension values */
  includeNulls?: boolean;
}

// ============================================================================
// Privacy Policy Types
// ============================================================================

/**
 * K-anonymity configuration
 */
export interface KAnonymityConfig {
  /** Minimum cohort size (k value) */
  minCohortSize: number;
  /** Fields considered quasi-identifiers */
  quasiIdentifiers?: string[];
  /** Action when k-anonymity is violated */
  violationAction: 'suppress' | 'generalize' | 'error';
}

/**
 * Differential privacy configuration
 */
export interface DifferentialPrivacyConfig {
  /** Privacy budget (epsilon) */
  epsilon: number;
  /** Optional delta for approximate DP */
  delta?: number;
  /** Sensitivity of the query (defaults to 1 for counts) */
  sensitivity?: number;
  /** Mechanism to use */
  mechanism: 'laplace' | 'gaussian' | 'exponential';
  /** Whether to track and enforce budgets */
  budgetTracking: boolean;
  /** Budget renewal period */
  budgetRenewalPeriod?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Suppression rules configuration
 */
export interface SuppressionConfig {
  /** Minimum count threshold for output */
  minCountThreshold: number;
  /** Fields that should be suppressed if unique */
  sensitiveFields?: string[];
  /** Whether to replace suppressed values with a placeholder */
  showSuppressed: boolean;
  /** The placeholder value for suppressed data */
  suppressedPlaceholder?: string | number | null;
}

/**
 * Generalization rules for hierarchical data
 */
export interface GeneralizationConfig {
  /** Field-specific generalization hierarchies */
  hierarchies: Record<string, string[][]>;
  /** Target level in hierarchy (0 = most specific) */
  targetLevel: number;
}

/**
 * Rate limiting configuration per tenant/user
 */
export interface RateLimitConfig {
  /** Maximum queries per time window */
  maxQueries: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Whether to include query complexity in limit */
  complexityWeighted: boolean;
}

/**
 * Complete privacy policy definition
 */
export interface PrivacyPolicy {
  /** Policy identifier */
  id: string;
  /** Human-readable policy name */
  name: string;
  /** Policy description */
  description: string;
  /** Whether this policy is active */
  enabled: boolean;
  /** Privacy mechanism type */
  mechanism: PrivacyMechanism;
  /** K-anonymity configuration */
  kAnonymity?: KAnonymityConfig;
  /** Differential privacy configuration */
  differentialPrivacy?: DifferentialPrivacyConfig;
  /** Suppression configuration */
  suppression?: SuppressionConfig;
  /** Generalization configuration */
  generalization?: GeneralizationConfig;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Data sources this policy applies to */
  applicableSources: DataSource[];
  /** Tenant IDs this policy applies to (empty = all) */
  tenantIds?: string[];
  /** Priority (higher = evaluated first) */
  priority: number;
  /** Audit level for this policy */
  auditLevel: 'none' | 'summary' | 'detailed';
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Execution Context and Results
// ============================================================================

/**
 * Privacy budget state for a tenant/user
 */
export interface PrivacyBudgetState {
  tenantId: string;
  userId?: string;
  /** Total epsilon allocated */
  totalBudget: number;
  /** Epsilon spent in current period */
  spentBudget: number;
  /** Number of queries in current period */
  queryCount: number;
  /** Period start time */
  periodStart: Date;
  /** Period end time */
  periodEnd: Date;
}

/**
 * Execution context for a query
 */
export interface ExecutionContext {
  /** Unique execution ID */
  executionId: string;
  /** Tenant ID making the request */
  tenantId: string;
  /** User ID making the request */
  userId: string;
  /** User roles for authorization */
  roles: string[];
  /** Applicable privacy policies */
  policies: PrivacyPolicy[];
  /** Current privacy budget state */
  budgetState?: PrivacyBudgetState;
  /** Request timestamp */
  timestamp: Date;
  /** Request metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Privacy audit record
 */
export interface PrivacyAuditRecord {
  /** Audit record ID */
  id: string;
  /** Execution ID */
  executionId: string;
  /** Tenant ID */
  tenantId: string;
  /** User ID */
  userId: string;
  /** The query that was executed */
  query: AggregateQuery;
  /** Policies that were applied */
  appliedPolicies: string[];
  /** Privacy mechanism used */
  mechanism: PrivacyMechanism;
  /** Epsilon consumed (if DP) */
  epsilonConsumed?: number;
  /** Rows suppressed (if any) */
  rowsSuppressed?: number;
  /** Query result status */
  status: QueryStatus;
  /** Denial reason (if denied) */
  denialReason?: string;
  /** Execution duration in ms */
  durationMs: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * A single row in the query result
 */
export interface AggregateResultRow {
  /** Dimension values */
  dimensions: Record<string, unknown>;
  /** Measure values (may include noise indicator) */
  measures: Record<string, number | null>;
  /** Whether this row was affected by privacy mechanisms */
  privacyAffected: boolean;
  /** Cohort size (if applicable) */
  cohortSize?: number;
}

/**
 * Warning about privacy implications
 */
export interface PrivacyWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  affectedFields?: string[];
}

/**
 * The complete query result
 */
export interface AggregateResult {
  /** Query status */
  status: QueryStatus;
  /** Result rows */
  data: AggregateResultRow[];
  /** Total row count before privacy filtering */
  totalCount: number;
  /** Row count after privacy filtering */
  filteredCount: number;
  /** Rows suppressed */
  suppressedCount: number;
  /** Privacy mechanism applied */
  privacyMechanism: PrivacyMechanism;
  /** Privacy warnings */
  warnings: PrivacyWarning[];
  /** Denial reason (if status is denied) */
  denialReason?: string;
  /** Budget consumed */
  budgetConsumed?: {
    epsilon: number;
    delta?: number;
  };
  /** Remaining budget */
  budgetRemaining?: {
    epsilon: number;
    queriesRemaining: number;
  };
  /** Execution metadata */
  metadata: {
    executionId: string;
    executionTimeMs: number;
    policiesApplied: string[];
    timestamp: Date;
  };
}

// ============================================================================
// Governance Integration Types
// ============================================================================

/**
 * Privacy profile assigned to a tenant/use-case
 */
export interface PrivacyProfile {
  /** Profile ID */
  id: string;
  /** Profile name */
  name: string;
  /** Associated tenant ID */
  tenantId: string;
  /** Use case identifier */
  useCase?: string;
  /** Default privacy policies to apply */
  defaultPolicies: string[];
  /** Privacy budget allocation */
  budgetAllocation: {
    epsilon: number;
    delta?: number;
    renewalPeriod: 'hour' | 'day' | 'week' | 'month';
  };
  /** Rate limits */
  rateLimits: RateLimitConfig;
  /** Allowed data sources */
  allowedSources: DataSource[];
  /** Blocked dimensions (cannot be queried) */
  blockedDimensions: string[];
  /** Blocked measures (cannot be computed) */
  blockedMeasures: string[];
  /** Maximum result rows */
  maxResultRows: number;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Governance decision for a query
 */
export interface GovernanceDecision {
  /** Whether the query is allowed */
  allowed: boolean;
  /** Reason if denied */
  reason?: string;
  /** Privacy profile to apply */
  profile?: PrivacyProfile;
  /** Additional policies to apply */
  additionalPolicies?: string[];
  /** Modifications required to the query */
  queryModifications?: {
    removeDimensions?: string[];
    removeMeasures?: string[];
    addFilters?: FilterCondition[];
    limitOverride?: number;
  };
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const FilterConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.nativeEnum(FilterOperator as Record<string, string>),
  value: z.unknown(),
  valueTo: z.unknown().optional(),
});

export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    logic: z.enum(['AND', 'OR']),
    conditions: z.array(z.union([FilterConditionSchema, FilterGroupSchema])),
  })
);

export const DimensionSchema = z.object({
  field: z.string().min(1),
  alias: z.string().optional(),
  timeGranularity: z.nativeEnum(TimeGranularity as Record<string, string>).optional(),
  bins: z.object({
    count: z.number().int().positive(),
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
});

export const MeasureSchema = z.object({
  field: z.string().min(1),
  aggregation: z.nativeEnum(AggregationType as Record<string, string>),
  alias: z.string().optional(),
  percentile: z.number().min(0).max(100).optional(),
});

export const TimeRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
}).refine(data => data.start <= data.end, {
  message: 'Start date must be before or equal to end date',
});

export const AggregateQuerySchema = z.object({
  id: z.string().uuid().optional(),
  source: z.nativeEnum(DataSource as Record<string, string>),
  dimensions: z.array(DimensionSchema).min(0).max(10),
  measures: z.array(MeasureSchema).min(1).max(20),
  filters: FilterGroupSchema.optional(),
  timeRange: TimeRangeSchema.optional(),
  limit: z.number().int().positive().max(10000).optional(),
  orderBy: z.array(z.object({
    field: z.string().min(1),
    direction: z.enum(['asc', 'desc']),
  })).optional(),
  includeNulls: z.boolean().optional(),
});

// ============================================================================
// Pre-defined Metric Types
// ============================================================================

/**
 * Pre-defined metric for dashboards
 */
export interface PredefinedMetric {
  /** Metric identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Category for organization */
  category: 'operational' | 'security' | 'research' | 'admin';
  /** The underlying aggregate query */
  query: AggregateQuery;
  /** Embedded privacy policy (overrides tenant defaults) */
  embeddedPolicy?: Partial<PrivacyPolicy>;
  /** Refresh interval in seconds */
  refreshInterval: number;
  /** Whether this metric is cacheable */
  cacheable: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
  /** Required roles to access */
  requiredRoles: string[];
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface ServiceConfig {
  server: {
    port: number;
    corsOrigins: string[];
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
  database: {
    postgres: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      maxConnections: number;
      idleTimeoutMs: number;
    };
    neo4j: {
      uri: string;
      username: string;
      password: string;
    };
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
  };
  privacy: {
    defaultMinCohortSize: number;
    defaultEpsilon: number;
    defaultMaxQueriesPerHour: number;
    enableDifferentialPrivacy: boolean;
    enableKAnonymity: boolean;
  };
  governance: {
    serviceUrl: string;
    opaEndpoint: string;
  };
  observability: {
    enableMetrics: boolean;
    enableTracing: boolean;
    serviceName: string;
    serviceVersion: string;
  };
}
