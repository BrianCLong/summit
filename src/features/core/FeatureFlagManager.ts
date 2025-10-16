/**
 * @fileoverview Feature Flag Lifecycle Management
 * Comprehensive feature flag infrastructure with LaunchDarkly/Unleash integration,
 * gradual rollout strategies, A/B testing, and complete lifecycle governance.
 */

import { EventEmitter } from 'events';
import { TenantContext } from '../tenancy/core/TenantManager.js';

/**
 * Feature flag types and targeting strategies
 */
export type FeatureFlagType =
  | 'boolean'
  | 'string'
  | 'number'
  | 'json'
  | 'percentage_rollout'
  | 'user_segment'
  | 'multivariate';

/**
 * Feature flag status lifecycle
 */
export type FeatureFlagStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'
  | 'deprecated';

/**
 * Rollout strategy types
 */
export type RolloutStrategy =
  | 'immediate'
  | 'gradual'
  | 'canary'
  | 'blue_green'
  | 'ring_deployment'
  | 'geographic'
  | 'user_segment';

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: FeatureFlagType;
  status: FeatureFlagStatus;
  defaultValue: any;
  variations: FeatureFlagVariation[];
  targeting: TargetingRules;
  rollout: RolloutConfiguration;
  metadata: {
    owner: string;
    team: string;
    environment: string;
    category: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
  analytics: AnalyticsConfiguration;
  lifecycle: LifecycleConfiguration;
  dependencies: string[]; // IDs of dependent flags
  killSwitch: boolean; // Emergency disable capability
}

/**
 * Feature flag variation for multivariate testing
 */
export interface FeatureFlagVariation {
  id: string;
  name: string;
  value: any;
  description?: string;
  weight?: number; // For percentage distribution
  metadata?: Record<string, any>;
}

/**
 * Targeting rules for flag evaluation
 */
export interface TargetingRules {
  enabled: boolean;
  rules: TargetingRule[];
  fallthrough: {
    variationId: string;
    rolloutPercentage?: number;
  };
  offVariation: string; // Variation to serve when flag is off
}

/**
 * Individual targeting rule
 */
export interface TargetingRule {
  id: string;
  description?: string;
  conditions: TargetingCondition[];
  variation: string;
  rolloutPercentage?: number;
  priority: number; // Lower numbers = higher priority
}

/**
 * Targeting condition for user matching
 */
export interface TargetingCondition {
  attribute: string; // user.id, user.email, tenant.tier, etc.
  operator:
    | 'equals'
    | 'not_equals'
    | 'in'
    | 'not_in'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'greater_than'
    | 'less_than'
    | 'regex';
  values: any[];
  negate?: boolean;
}

/**
 * Rollout configuration for gradual releases
 */
export interface RolloutConfiguration {
  strategy: RolloutStrategy;
  schedule?: {
    startTime: Date;
    endTime?: Date;
    phases: RolloutPhase[];
  };
  targeting: {
    userSegments?: string[];
    tenantTiers?: string[];
    geographicRegions?: string[];
    customAttributes?: Record<string, any>;
  };
  safetyChecks: SafetyCheck[];
  automaticRollback: {
    enabled: boolean;
    triggers: RollbackTrigger[];
    rollbackToVariation: string;
  };
}

/**
 * Rollout phase for gradual deployment
 */
export interface RolloutPhase {
  id: string;
  name: string;
  percentage: number;
  duration?: number; // minutes
  criteria: {
    errorThreshold?: number; // percentage
    performanceThreshold?: number; // ms
    customMetrics?: Array<{
      name: string;
      threshold: number;
      operator: 'greater_than' | 'less_than';
    }>;
  };
  approvalRequired: boolean;
}

/**
 * Safety check configuration
 */
export interface SafetyCheck {
  type: 'error_rate' | 'performance' | 'business_metric' | 'custom';
  threshold: number;
  window: number; // minutes
  enabled: boolean;
  description: string;
}

/**
 * Rollback trigger configuration
 */
export interface RollbackTrigger {
  type:
    | 'error_rate'
    | 'performance_degradation'
    | 'business_impact'
    | 'manual'
    | 'dependency_failure';
  threshold: number;
  enabled: boolean;
  autoExecute: boolean;
}

/**
 * Analytics configuration for flag tracking
 */
export interface AnalyticsConfiguration {
  enabled: boolean;
  trackingEvents: string[];
  customMetrics: string[];
  cohortAnalysis: boolean;
  conversionTracking: {
    enabled: boolean;
    goalEvents: string[];
  };
  sampling: {
    enabled: boolean;
    rate: number; // 0-1
  };
}

/**
 * Lifecycle configuration for flag management
 */
export interface LifecycleConfiguration {
  temporary: boolean;
  expiryDate?: Date;
  reviewSchedule?: {
    frequency: 'weekly' | 'monthly' | 'quarterly';
    reviewers: string[];
  };
  promotionCriteria?: {
    minimumUsage: number;
    minimumDuration: number; // days
    approvalRequired: boolean;
  };
  deprecationWarning?: {
    enabled: boolean;
    warningPeriod: number; // days
    notificationChannels: string[];
  };
}

/**
 * Evaluation context for flag assessment
 */
export interface EvaluationContext {
  user: {
    id: string;
    email?: string;
    attributes: Record<string, any>;
  };
  tenant?: TenantContext;
  request: {
    ip?: string;
    userAgent?: string;
    timestamp: Date;
    sessionId?: string;
  };
  environment: string;
  version?: string;
  customAttributes?: Record<string, any>;
}

/**
 * Flag evaluation result
 */
export interface EvaluationResult {
  flagKey: string;
  value: any;
  variationId: string;
  reason: EvaluationReason;
  ruleId?: string;
  metadata: {
    evaluatedAt: Date;
    version: number;
    fromCache: boolean;
    evaluationTime: number; // ms
  };
  trackingEnabled: boolean;
}

/**
 * Evaluation reason codes
 */
export type EvaluationReason =
  | 'default'
  | 'off'
  | 'target_match'
  | 'rule_match'
  | 'fallthrough'
  | 'error'
  | 'prerequisite_failed';

/**
 * A/B test configuration
 */
export interface ABTestConfiguration {
  testId: string;
  name: string;
  description: string;
  flagKey: string;
  variations: {
    control: string; // variation ID
    treatment: string[]; // variation IDs
  };
  allocation: {
    [variationId: string]: number; // percentage
  };
  metrics: {
    primary: string;
    secondary: string[];
  };
  duration: {
    planned: number; // days
    minimum: number; // minimum days before evaluation
  };
  significance: {
    threshold: number; // 0.95 for 95% confidence
    minimumSampleSize: number;
  };
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  results?: ABTestResults;
}

/**
 * A/B test results
 */
export interface ABTestResults {
  duration: number; // actual days run
  sampleSize: {
    [variationId: string]: number;
  };
  conversionRates: {
    [variationId: string]: number;
  };
  statisticalSignificance: {
    [variationId: string]: {
      pValue: number;
      confidence: number;
      significantlyDifferent: boolean;
    };
  };
  businessImpact: {
    metric: string;
    change: number; // percentage change
    value: number; // absolute value impact
  }[];
  recommendation:
    | 'continue_control'
    | 'implement_treatment'
    | 'run_longer'
    | 'redesign_test';
}

/**
 * Feature flag audit event
 */
export interface FlagAuditEvent {
  id: string;
  flagKey: string;
  action:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'enabled'
    | 'disabled'
    | 'evaluated'
    | 'rolled_back';
  actor: {
    type: 'user' | 'system' | 'api';
    id: string;
    name?: string;
  };
  timestamp: Date;
  environment: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  context?: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
  };
  metadata: Record<string, any>;
}

/**
 * Comprehensive feature flag management system
 */
export class FeatureFlagManager extends EventEmitter {
  private flags: Map<string, FeatureFlag> = new Map();
  private evaluationCache: Map<string, EvaluationResult> = new Map();
  private abTests: Map<string, ABTestConfiguration> = new Map();
  private auditLog: FlagAuditEvent[] = [];
  private evaluationMetrics: Map<string, any[]> = new Map();

  constructor(
    private config: {
      provider: 'launchdarkly' | 'unleash' | 'internal';
      apiKey?: string;
      endpoint?: string;
      environment: string;
      cacheTimeout: number; // ms
      enableAnalytics: boolean;
      enableAudit: boolean;
      defaultRolloutStrategy: RolloutStrategy;
    },
  ) {
    super();
    this.initializeProvider();
    this.startBackgroundTasks();
  }

  /**
   * Create new feature flag with comprehensive configuration
   */
  async createFlag(
    flagData: Omit<FeatureFlag, 'id' | 'metadata'>,
  ): Promise<FeatureFlag> {
    // Generate unique ID
    const id = this.generateFlagId();

    // Validate flag configuration
    await this.validateFlagConfiguration(flagData);

    // Check for key conflicts
    if (this.flags.has(flagData.key)) {
      throw new Error(`Flag with key '${flagData.key}' already exists`);
    }

    const flag: FeatureFlag = {
      id,
      ...flagData,
      metadata: {
        owner: flagData.metadata?.owner || 'system',
        team: flagData.metadata?.team || 'platform',
        environment: this.config.environment,
        category: flagData.metadata?.category || 'feature',
        tags: flagData.metadata?.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    };

    // Store flag
    this.flags.set(flag.key, flag);

    // Initialize metrics tracking
    this.evaluationMetrics.set(flag.key, []);

    // Audit log
    await this.auditFlagAction(
      flag.key,
      'created',
      {
        type: 'system',
        id: 'system',
      },
      {
        flag: this.sanitizeFlagForAudit(flag),
      },
    );

    // Emit event
    this.emit('flag:created', { flag });

    // Sync with external provider if configured
    if (this.config.provider !== 'internal') {
      await this.syncFlagToProvider(flag);
    }

    return flag;
  }

  /**
   * Update existing feature flag
   */
  async updateFlag(
    flagKey: string,
    updates: Partial<FeatureFlag>,
    actor: FlagAuditEvent['actor'],
  ): Promise<FeatureFlag> {
    const existingFlag = this.flags.get(flagKey);
    if (!existingFlag) {
      throw new Error(`Flag not found: ${flagKey}`);
    }

    // Validate updates
    const updatedFlag = { ...existingFlag, ...updates };
    await this.validateFlagConfiguration(updatedFlag);

    // Track changes for audit
    const changes = this.calculateFlagChanges(existingFlag, updates);

    // Update version and timestamp
    updatedFlag.metadata.updatedAt = new Date();
    updatedFlag.metadata.version += 1;

    // Store updated flag
    this.flags.set(flagKey, updatedFlag);

    // Clear cache for this flag
    this.clearFlagCache(flagKey);

    // Audit log
    await this.auditFlagAction(flagKey, 'updated', actor, {
      changes,
      version: updatedFlag.metadata.version,
    });

    // Emit event
    this.emit('flag:updated', { flag: updatedFlag, changes });

    // Sync with external provider
    if (this.config.provider !== 'internal') {
      await this.syncFlagToProvider(updatedFlag);
    }

    return updatedFlag;
  }

  /**
   * Evaluate feature flag for given context
   */
  async evaluateFlag(
    flagKey: string,
    context: EvaluationContext,
    defaultValue?: any,
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      // Get flag configuration
      const flag = this.flags.get(flagKey);
      if (!flag) {
        return this.createErrorResult(flagKey, defaultValue, 'Flag not found');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(flagKey, context);
      const cached = this.evaluationCache.get(cacheKey);

      if (cached && !this.isCacheExpired(cached)) {
        await this.recordEvaluation(flagKey, cached, context);
        return cached;
      }

      // Perform evaluation
      const result = await this.performEvaluation(flag, context, defaultValue);
      result.metadata.evaluationTime = Date.now() - startTime;

      // Cache result
      this.evaluationCache.set(cacheKey, result);

      // Record evaluation for analytics
      await this.recordEvaluation(flagKey, result, context);

      // Audit evaluation if required
      if (flag.analytics.enabled || this.config.enableAudit) {
        await this.auditFlagAction(
          flagKey,
          'evaluated',
          {
            type: 'user',
            id: context.user.id,
          },
          {
            variation: result.variationId,
            reason: result.reason,
            value: result.value,
          },
        );
      }

      return result;
    } catch (error) {
      console.error(`Flag evaluation error for ${flagKey}:`, error);

      return this.createErrorResult(
        flagKey,
        defaultValue,
        `Evaluation error: ${error.message}`,
      );
    }
  }

  /**
   * Bulk evaluate multiple flags for efficiency
   */
  async evaluateFlags(
    flagKeys: string[],
    context: EvaluationContext,
  ): Promise<Record<string, EvaluationResult>> {
    const results: Record<string, EvaluationResult> = {};

    // Evaluate flags in parallel
    const evaluations = flagKeys.map(async (flagKey) => {
      try {
        const result = await this.evaluateFlag(flagKey, context);
        results[flagKey] = result;
      } catch (error) {
        results[flagKey] = this.createErrorResult(flagKey, null, error.message);
      }
    });

    await Promise.all(evaluations);

    return results;
  }

  /**
   * Start gradual rollout for feature flag
   */
  async startRollout(
    flagKey: string,
    actor: FlagAuditEvent['actor'],
  ): Promise<void> {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Flag not found: ${flagKey}`);
    }

    if (flag.status !== 'draft' && flag.status !== 'paused') {
      throw new Error(
        `Cannot start rollout for flag in status: ${flag.status}`,
      );
    }

    // Update flag status
    await this.updateFlag(flagKey, { status: 'active' }, actor);

    // Initialize rollout process
    if (flag.rollout.strategy === 'gradual' && flag.rollout.schedule) {
      await this.scheduleRolloutPhases(flag);
    }

    // Emit rollout started event
    this.emit('rollout:started', { flagKey, rollout: flag.rollout });

    // Audit action
    await this.auditFlagAction(flagKey, 'enabled', actor, {
      rolloutStrategy: flag.rollout.strategy,
    });
  }

  /**
   * Pause rollout for feature flag
   */
  async pauseRollout(
    flagKey: string,
    reason: string,
    actor: FlagAuditEvent['actor'],
  ): Promise<void> {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Flag not found: ${flagKey}`);
    }

    if (flag.status !== 'active') {
      throw new Error(
        `Cannot pause rollout for flag in status: ${flag.status}`,
      );
    }

    // Update flag status
    await this.updateFlag(flagKey, { status: 'paused' }, actor);

    // Emit rollout paused event
    this.emit('rollout:paused', { flagKey, reason });

    // Audit action
    await this.auditFlagAction(flagKey, 'disabled', actor, { reason });
  }

  /**
   * Emergency rollback feature flag
   */
  async emergencyRollback(
    flagKey: string,
    reason: string,
    actor: FlagAuditEvent['actor'],
  ): Promise<void> {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Flag not found: ${flagKey}`);
    }

    // Disable flag immediately
    const rollbackVariation =
      flag.rollout.automaticRollback.rollbackToVariation;

    await this.updateFlag(
      flagKey,
      {
        status: 'paused',
        targeting: {
          ...flag.targeting,
          fallthrough: {
            variationId: rollbackVariation,
            rolloutPercentage: 0,
          },
        },
      },
      actor,
    );

    // Clear all caches for immediate effect
    this.clearFlagCache(flagKey);

    // Emit rollback event
    this.emit('rollout:rolled_back', { flagKey, reason, rollbackVariation });

    // Audit action
    await this.auditFlagAction(flagKey, 'rolled_back', actor, {
      reason,
      rollbackVariation,
      emergency: true,
    });

    // Alert monitoring systems
    this.alertRollback(flagKey, reason);
  }

  /**
   * Create A/B test configuration
   */
  async createABTest(
    testConfig: Omit<ABTestConfiguration, 'testId'>,
  ): Promise<ABTestConfiguration> {
    const testId = this.generateTestId();

    const abTest: ABTestConfiguration = {
      testId,
      ...testConfig,
    };

    // Validate test configuration
    await this.validateABTestConfiguration(abTest);

    // Ensure flag exists
    const flag = this.flags.get(abTest.flagKey);
    if (!flag) {
      throw new Error(`Flag not found for A/B test: ${abTest.flagKey}`);
    }

    // Store test configuration
    this.abTests.set(testId, abTest);

    // Update flag with A/B test analytics
    await this.updateFlag(
      abTest.flagKey,
      {
        analytics: {
          ...flag.analytics,
          enabled: true,
          trackingEvents: [
            ...flag.analytics.trackingEvents,
            ...abTest.metrics.secondary,
          ],
          conversionTracking: {
            enabled: true,
            goalEvents: [abTest.metrics.primary],
          },
        },
      },
      { type: 'system', id: 'ab_test_system' },
    );

    this.emit('ab_test:created', { test: abTest });

    return abTest;
  }

  /**
   * Start A/B test
   */
  async startABTest(testId: string): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test not found: ${testId}`);
    }

    if (test.status !== 'draft') {
      throw new Error(`Cannot start A/B test in status: ${test.status}`);
    }

    // Update test status
    test.status = 'running';
    this.abTests.set(testId, test);

    // Configure flag for A/B test
    await this.configureABTestFlag(test);

    this.emit('ab_test:started', { testId, test });
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResults | null> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test not found: ${testId}`);
    }

    // Calculate results from evaluation metrics
    const results = await this.calculateABTestResults(test);

    // Update test with results
    test.results = results;
    this.abTests.set(testId, test);

    return results;
  }

  /**
   * Get flag evaluation metrics
   */
  getEvaluationMetrics(
    flagKey: string,
    timeRange: { start: Date; end: Date },
  ): {
    totalEvaluations: number;
    uniqueUsers: number;
    variationBreakdown: Record<string, number>;
    conversionRates: Record<string, number>;
    performanceMetrics: {
      avgEvaluationTime: number;
      cacheHitRate: number;
      errorRate: number;
    };
  } {
    const metrics = this.evaluationMetrics.get(flagKey) || [];
    const filteredMetrics = metrics.filter(
      (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
    );

    const totalEvaluations = filteredMetrics.length;
    const uniqueUsers = new Set(filteredMetrics.map((m) => m.userId)).size;

    const variationBreakdown: Record<string, number> = {};
    const conversionRates: Record<string, number> = {};

    let totalEvaluationTime = 0;
    let cacheHits = 0;
    let errors = 0;

    filteredMetrics.forEach((metric) => {
      // Variation breakdown
      variationBreakdown[metric.variationId] =
        (variationBreakdown[metric.variationId] || 0) + 1;

      // Performance metrics
      totalEvaluationTime += metric.evaluationTime || 0;
      if (metric.fromCache) cacheHits++;
      if (metric.reason === 'error') errors++;

      // Conversion tracking
      if (metric.converted) {
        conversionRates[metric.variationId] =
          (conversionRates[metric.variationId] || 0) + 1;
      }
    });

    // Calculate conversion rates as percentages
    Object.keys(conversionRates).forEach((variation) => {
      const conversions = conversionRates[variation];
      const total = variationBreakdown[variation] || 1;
      conversionRates[variation] = (conversions / total) * 100;
    });

    return {
      totalEvaluations,
      uniqueUsers,
      variationBreakdown,
      conversionRates,
      performanceMetrics: {
        avgEvaluationTime:
          totalEvaluations > 0 ? totalEvaluationTime / totalEvaluations : 0,
        cacheHitRate:
          totalEvaluations > 0 ? (cacheHits / totalEvaluations) * 100 : 0,
        errorRate: totalEvaluations > 0 ? (errors / totalEvaluations) * 100 : 0,
      },
    };
  }

  /**
   * Get audit log for flag
   */
  getFlagAuditLog(flagKey: string, limit: number = 100): FlagAuditEvent[] {
    return this.auditLog
      .filter((event) => event.flagKey === flagKey)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Validate flag configuration
   */
  private async validateFlagConfiguration(
    flag: Partial<FeatureFlag>,
  ): Promise<void> {
    if (!flag.key || !flag.name || !flag.type) {
      throw new Error('Flag key, name, and type are required');
    }

    // Validate key format
    if (!/^[a-zA-Z0-9_-]+$/.test(flag.key)) {
      throw new Error(
        'Flag key can only contain alphanumeric characters, underscores, and hyphens',
      );
    }

    // Validate variations
    if (!flag.variations || flag.variations.length === 0) {
      throw new Error('At least one variation is required');
    }

    // Validate targeting rules
    if (flag.targeting?.rules) {
      for (const rule of flag.targeting.rules) {
        if (!rule.conditions || rule.conditions.length === 0) {
          throw new Error(
            `Targeting rule ${rule.id} must have at least one condition`,
          );
        }
      }
    }

    // Validate rollout configuration
    if (flag.rollout?.schedule?.phases) {
      let totalPercentage = 0;
      for (const phase of flag.rollout.schedule.phases) {
        totalPercentage += phase.percentage;
      }

      if (totalPercentage > 100) {
        throw new Error('Total rollout percentage cannot exceed 100%');
      }
    }
  }

  /**
   * Perform flag evaluation logic
   */
  private async performEvaluation(
    flag: FeatureFlag,
    context: EvaluationContext,
    defaultValue?: any,
  ): Promise<EvaluationResult> {
    // Check if flag is disabled
    if (flag.status !== 'active') {
      return {
        flagKey: flag.key,
        value: defaultValue ?? flag.defaultValue,
        variationId: flag.targeting.offVariation,
        reason: 'off',
        metadata: {
          evaluatedAt: new Date(),
          version: flag.metadata.version,
          fromCache: false,
          evaluationTime: 0,
        },
        trackingEnabled: flag.analytics.enabled,
      };
    }

    // Check prerequisites/dependencies
    if (flag.dependencies.length > 0) {
      const prerequisitesFailed = await this.checkPrerequisites(
        flag.dependencies,
        context,
      );
      if (prerequisitesFailed) {
        return this.createDefaultResult(flag, 'prerequisite_failed');
      }
    }

    // Evaluate targeting rules
    if (flag.targeting.enabled && flag.targeting.rules.length > 0) {
      const ruleResult = await this.evaluateTargetingRules(
        flag.targeting.rules,
        context,
      );
      if (ruleResult) {
        const variation = flag.variations.find(
          (v) => v.id === ruleResult.variationId,
        );
        return {
          flagKey: flag.key,
          value: variation?.value ?? flag.defaultValue,
          variationId: ruleResult.variationId,
          reason: 'rule_match',
          ruleId: ruleResult.ruleId,
          metadata: {
            evaluatedAt: new Date(),
            version: flag.metadata.version,
            fromCache: false,
            evaluationTime: 0,
          },
          trackingEnabled: flag.analytics.enabled,
        };
      }
    }

    // Apply fallthrough logic
    const fallthrough = flag.targeting.fallthrough;
    if (fallthrough.rolloutPercentage !== undefined) {
      const userBucket = this.calculateUserBucket(context.user.id, flag.key);
      if (userBucket < fallthrough.rolloutPercentage) {
        const variation = flag.variations.find(
          (v) => v.id === fallthrough.variationId,
        );
        return {
          flagKey: flag.key,
          value: variation?.value ?? flag.defaultValue,
          variationId: fallthrough.variationId,
          reason: 'fallthrough',
          metadata: {
            evaluatedAt: new Date(),
            version: flag.metadata.version,
            fromCache: false,
            evaluationTime: 0,
          },
          trackingEnabled: flag.analytics.enabled,
        };
      }
    }

    // Default to off variation
    const offVariation = flag.variations.find(
      (v) => v.id === flag.targeting.offVariation,
    );
    return {
      flagKey: flag.key,
      value: offVariation?.value ?? defaultValue ?? flag.defaultValue,
      variationId: flag.targeting.offVariation,
      reason: 'default',
      metadata: {
        evaluatedAt: new Date(),
        version: flag.metadata.version,
        fromCache: false,
        evaluationTime: 0,
      },
      trackingEnabled: flag.analytics.enabled,
    };
  }

  /**
   * Evaluate targeting rules against context
   */
  private async evaluateTargetingRules(
    rules: TargetingRule[],
    context: EvaluationContext,
  ): Promise<{ ruleId: string; variationId: string } | null> {
    // Sort rules by priority
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (await this.evaluateRuleConditions(rule.conditions, context)) {
        // Check rollout percentage if specified
        if (rule.rolloutPercentage !== undefined) {
          const userBucket = this.calculateUserBucket(context.user.id, rule.id);
          if (userBucket >= rule.rolloutPercentage) {
            continue; // Skip this rule
          }
        }

        return {
          ruleId: rule.id,
          variationId: rule.variation,
        };
      }
    }

    return null;
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateRuleConditions(
    conditions: TargetingCondition[],
    context: EvaluationContext,
  ): Promise<boolean> {
    for (const condition of conditions) {
      const attributeValue = this.getAttributeValue(
        condition.attribute,
        context,
      );
      const matches = this.evaluateCondition(condition, attributeValue);

      if (!matches) {
        return false; // All conditions must match (AND logic)
      }
    }

    return true;
  }

  /**
   * Get attribute value from context
   */
  private getAttributeValue(
    attribute: string,
    context: EvaluationContext,
  ): any {
    const parts = attribute.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(
    condition: TargetingCondition,
    attributeValue: any,
  ): boolean {
    let result = false;

    switch (condition.operator) {
      case 'equals':
        result = condition.values.includes(attributeValue);
        break;

      case 'not_equals':
        result = !condition.values.includes(attributeValue);
        break;

      case 'in':
        result = Array.isArray(attributeValue)
          ? attributeValue.some((v) => condition.values.includes(v))
          : condition.values.includes(attributeValue);
        break;

      case 'not_in':
        result = Array.isArray(attributeValue)
          ? !attributeValue.some((v) => condition.values.includes(v))
          : !condition.values.includes(attributeValue);
        break;

      case 'contains':
        result =
          typeof attributeValue === 'string' &&
          condition.values.some((v) => attributeValue.includes(v));
        break;

      case 'starts_with':
        result =
          typeof attributeValue === 'string' &&
          condition.values.some((v) => attributeValue.startsWith(v));
        break;

      case 'ends_with':
        result =
          typeof attributeValue === 'string' &&
          condition.values.some((v) => attributeValue.endsWith(v));
        break;

      case 'greater_than':
        result =
          typeof attributeValue === 'number' &&
          condition.values.some((v) => attributeValue > Number(v));
        break;

      case 'less_than':
        result =
          typeof attributeValue === 'number' &&
          condition.values.some((v) => attributeValue < Number(v));
        break;

      case 'regex':
        if (typeof attributeValue === 'string') {
          result = condition.values.some((pattern) => {
            try {
              return new RegExp(pattern).test(attributeValue);
            } catch {
              return false;
            }
          });
        }
        break;
    }

    return condition.negate ? !result : result;
  }

  /**
   * Calculate user bucket for consistent percentage rollouts
   */
  private calculateUserBucket(userId: string, salt: string): number {
    const crypto = require('crypto');
    const hash = crypto
      .createHash('md5')
      .update(`${userId}:${salt}`)
      .digest('hex');
    const bucket = parseInt(hash.substr(0, 8), 16) % 100;
    return bucket;
  }

  /**
   * Check prerequisite flags
   */
  private async checkPrerequisites(
    dependencies: string[],
    context: EvaluationContext,
  ): Promise<boolean> {
    for (const dependency of dependencies) {
      try {
        const result = await this.evaluateFlag(dependency, context);
        if (!result.value) {
          return true; // Prerequisites failed
        }
      } catch (error) {
        return true; // Prerequisites failed due to error
      }
    }

    return false; // All prerequisites passed
  }

  /**
   * Generate cache key for evaluation result
   */
  private generateCacheKey(
    flagKey: string,
    context: EvaluationContext,
  ): string {
    const keyData = {
      flagKey,
      userId: context.user.id,
      tenantId: context.tenant?.tenantId,
      customAttributes: context.customAttributes,
    };

    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(result: EvaluationResult): boolean {
    const now = Date.now();
    const cacheTime = result.metadata.evaluatedAt.getTime();
    return now - cacheTime > this.config.cacheTimeout;
  }

  /**
   * Clear cache entries for specific flag
   */
  private clearFlagCache(flagKey: string): void {
    const keysToDelete: string[] = [];

    for (const [cacheKey, result] of this.evaluationCache.entries()) {
      if (result.flagKey === flagKey) {
        keysToDelete.push(cacheKey);
      }
    }

    keysToDelete.forEach((key) => this.evaluationCache.delete(key));
  }

  /**
   * Create error result
   */
  private createErrorResult(
    flagKey: string,
    defaultValue: any,
    errorMessage: string,
  ): EvaluationResult {
    return {
      flagKey,
      value: defaultValue,
      variationId: 'error',
      reason: 'error',
      metadata: {
        evaluatedAt: new Date(),
        version: 0,
        fromCache: false,
        evaluationTime: 0,
      },
      trackingEnabled: false,
    };
  }

  /**
   * Create default result for flag
   */
  private createDefaultResult(
    flag: FeatureFlag,
    reason: EvaluationReason,
  ): EvaluationResult {
    const offVariation = flag.variations.find(
      (v) => v.id === flag.targeting.offVariation,
    );

    return {
      flagKey: flag.key,
      value: offVariation?.value ?? flag.defaultValue,
      variationId: flag.targeting.offVariation,
      reason,
      metadata: {
        evaluatedAt: new Date(),
        version: flag.metadata.version,
        fromCache: false,
        evaluationTime: 0,
      },
      trackingEnabled: flag.analytics.enabled,
    };
  }

  /**
   * Record evaluation for analytics
   */
  private async recordEvaluation(
    flagKey: string,
    result: EvaluationResult,
    context: EvaluationContext,
  ): Promise<void> {
    if (!this.config.enableAnalytics) return;

    const metrics = this.evaluationMetrics.get(flagKey) || [];

    metrics.push({
      timestamp: new Date(),
      userId: context.user.id,
      tenantId: context.tenant?.tenantId,
      variationId: result.variationId,
      value: result.value,
      reason: result.reason,
      evaluationTime: result.metadata.evaluationTime,
      fromCache: result.metadata.fromCache,
      environment: this.config.environment,
      sessionId: context.request.sessionId,
      userAgent: context.request.userAgent,
      ip: context.request.ip,
    });

    // Keep only recent metrics (last 10000 per flag)
    if (metrics.length > 10000) {
      metrics.splice(0, metrics.length - 10000);
    }

    this.evaluationMetrics.set(flagKey, metrics);
  }

  /**
   * Audit flag action
   */
  private async auditFlagAction(
    flagKey: string,
    action: FlagAuditEvent['action'],
    actor: FlagAuditEvent['actor'],
    metadata: Record<string, any> = {},
  ): Promise<void> {
    if (!this.config.enableAudit) return;

    const auditEvent: FlagAuditEvent = {
      id: require('crypto').randomUUID(),
      flagKey,
      action,
      actor,
      timestamp: new Date(),
      environment: this.config.environment,
      metadata,
    };

    this.auditLog.push(auditEvent);

    // Keep audit log size manageable (last 5000 events)
    if (this.auditLog.length > 5000) {
      this.auditLog = this.auditLog.slice(-5000);
    }

    this.emit('audit:logged', auditEvent);
  }

  /**
   * Calculate changes between flag versions
   */
  private calculateFlagChanges(
    oldFlag: FeatureFlag,
    updates: Partial<FeatureFlag>,
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    Object.keys(updates).forEach((key) => {
      if (
        key !== 'metadata' &&
        updates[key as keyof FeatureFlag] !== oldFlag[key as keyof FeatureFlag]
      ) {
        changes.push({
          field: key,
          oldValue: oldFlag[key as keyof FeatureFlag],
          newValue: updates[key as keyof FeatureFlag],
        });
      }
    });

    return changes;
  }

  /**
   * Initialize feature flag provider
   */
  private initializeProvider(): void {
    switch (this.config.provider) {
      case 'launchdarkly':
        // Initialize LaunchDarkly SDK
        break;

      case 'unleash':
        // Initialize Unleash SDK
        break;

      case 'internal':
        // Internal implementation (already initialized)
        break;
    }
  }

  /**
   * Sync flag to external provider
   */
  private async syncFlagToProvider(flag: FeatureFlag): Promise<void> {
    // Implementation would sync to external provider
    console.log(`Syncing flag ${flag.key} to ${this.config.provider}`);
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredCache();
      },
      5 * 60 * 1000,
    );

    // Check rollout safety metrics every minute
    setInterval(() => {
      this.checkRolloutSafety();
    }, 60 * 1000);

    // Lifecycle management checks every hour
    setInterval(
      () => {
        this.performLifecycleChecks();
      },
      60 * 60 * 1000,
    );
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, result] of this.evaluationCache.entries()) {
      if (
        now - result.metadata.evaluatedAt.getTime() >
        this.config.cacheTimeout
      ) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.evaluationCache.delete(key));
  }

  /**
   * Check rollout safety metrics
   */
  private async checkRolloutSafety(): Promise<void> {
    for (const [flagKey, flag] of this.flags.entries()) {
      if (flag.status === 'active' && flag.rollout.safetyChecks.length > 0) {
        try {
          await this.evaluateRolloutSafety(flagKey, flag);
        } catch (error) {
          console.error(`Safety check failed for flag ${flagKey}:`, error);
        }
      }
    }
  }

  /**
   * Evaluate rollout safety for specific flag
   */
  private async evaluateRolloutSafety(
    flagKey: string,
    flag: FeatureFlag,
  ): Promise<void> {
    const metrics = this.evaluationMetrics.get(flagKey) || [];
    const recentMetrics = metrics.filter(
      (m) => Date.now() - m.timestamp.getTime() < 5 * 60 * 1000, // Last 5 minutes
    );

    for (const safetyCheck of flag.rollout.safetyChecks) {
      if (!safetyCheck.enabled) continue;

      let shouldTrigger = false;

      switch (safetyCheck.type) {
        case 'error_rate':
          const errorRate = this.calculateErrorRate(recentMetrics);
          shouldTrigger = errorRate > safetyCheck.threshold;
          break;

        case 'performance':
          const avgPerformance =
            this.calculateAveragePerformance(recentMetrics);
          shouldTrigger = avgPerformance > safetyCheck.threshold;
          break;

        // Add more safety check types as needed
      }

      if (shouldTrigger && flag.rollout.automaticRollback.enabled) {
        await this.triggerAutomaticRollback(flagKey, flag, safetyCheck);
        break; // Only trigger once
      }
    }
  }

  /**
   * Calculate error rate from metrics
   */
  private calculateErrorRate(metrics: any[]): number {
    if (metrics.length === 0) return 0;

    const errors = metrics.filter((m) => m.reason === 'error').length;
    return (errors / metrics.length) * 100;
  }

  /**
   * Calculate average performance from metrics
   */
  private calculateAveragePerformance(metrics: any[]): number {
    if (metrics.length === 0) return 0;

    const totalTime = metrics.reduce(
      (sum, m) => sum + (m.evaluationTime || 0),
      0,
    );
    return totalTime / metrics.length;
  }

  /**
   * Trigger automatic rollback
   */
  private async triggerAutomaticRollback(
    flagKey: string,
    flag: FeatureFlag,
    safetyCheck: SafetyCheck,
  ): Promise<void> {
    const rollbackTrigger = flag.rollout.automaticRollback.triggers.find(
      (t) => t.type === safetyCheck.type && t.enabled && t.autoExecute,
    );

    if (rollbackTrigger) {
      await this.emergencyRollback(
        flagKey,
        `Automatic rollback triggered by ${safetyCheck.type} safety check`,
        { type: 'system', id: 'automatic_rollback' },
      );
    }
  }

  /**
   * Perform lifecycle management checks
   */
  private async performLifecycleChecks(): Promise<void> {
    const now = new Date();

    for (const [flagKey, flag] of this.flags.entries()) {
      // Check for expired flags
      if (
        flag.lifecycle.temporary &&
        flag.lifecycle.expiryDate &&
        flag.lifecycle.expiryDate <= now
      ) {
        await this.updateFlag(
          flagKey,
          { status: 'completed' },
          {
            type: 'system',
            id: 'lifecycle_manager',
          },
        );

        this.emit('flag:expired', { flagKey });
      }

      // Check for review requirements
      if (flag.lifecycle.reviewSchedule) {
        // Implementation would check if review is due
        // and send notifications to reviewers
      }

      // Check deprecation warnings
      if (flag.lifecycle.deprecationWarning?.enabled) {
        // Implementation would send deprecation warnings
        // if flag is approaching end of life
      }
    }
  }

  /**
   * Validate A/B test configuration
   */
  private async validateABTestConfiguration(
    test: ABTestConfiguration,
  ): Promise<void> {
    // Validate allocation adds up to 100%
    const totalAllocation = Object.values(test.allocation).reduce(
      (sum, pct) => sum + pct,
      0,
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('A/B test allocation must add up to 100%');
    }

    // Validate variations exist in flag
    const flag = this.flags.get(test.flagKey);
    if (!flag) {
      throw new Error(`Flag not found: ${test.flagKey}`);
    }

    const flagVariationIds = flag.variations.map((v) => v.id);
    if (!flagVariationIds.includes(test.variations.control)) {
      throw new Error(
        `Control variation ${test.variations.control} not found in flag`,
      );
    }

    for (const treatmentId of test.variations.treatment) {
      if (!flagVariationIds.includes(treatmentId)) {
        throw new Error(`Treatment variation ${treatmentId} not found in flag`);
      }
    }
  }

  /**
   * Configure flag for A/B test
   */
  private async configureABTestFlag(test: ABTestConfiguration): Promise<void> {
    const flag = this.flags.get(test.flagKey)!;

    // Update targeting rules to implement A/B test allocation
    const abTestRule: TargetingRule = {
      id: `ab_test_${test.testId}`,
      description: `A/B test: ${test.name}`,
      conditions: [], // Apply to all users (or specific segments if configured)
      variation: test.variations.control, // Default, will be overridden by percentage
      priority: 0, // Highest priority
      rolloutPercentage: 100, // Apply to all matching users
    };

    // Add rule to flag
    const updatedRules = [abTestRule, ...flag.targeting.rules];

    await this.updateFlag(
      test.flagKey,
      {
        targeting: {
          ...flag.targeting,
          rules: updatedRules,
        },
      },
      { type: 'system', id: 'ab_test_configurator' },
    );
  }

  /**
   * Calculate A/B test results
   */
  private async calculateABTestResults(
    test: ABTestConfiguration,
  ): Promise<ABTestResults> {
    const metrics = this.evaluationMetrics.get(test.flagKey) || [];

    // Filter metrics to test period
    const testMetrics = metrics.filter((m) => {
      // Implementation would filter by test start/end dates
      return true; // Placeholder
    });

    const sampleSize: Record<string, number> = {};
    const conversions: Record<string, number> = {};

    // Calculate sample sizes and conversions
    testMetrics.forEach((metric) => {
      sampleSize[metric.variationId] =
        (sampleSize[metric.variationId] || 0) + 1;

      if (metric.converted) {
        conversions[metric.variationId] =
          (conversions[metric.variationId] || 0) + 1;
      }
    });

    // Calculate conversion rates
    const conversionRates: Record<string, number> = {};
    Object.keys(sampleSize).forEach((variation) => {
      const sample = sampleSize[variation] || 1;
      const converted = conversions[variation] || 0;
      conversionRates[variation] = (converted / sample) * 100;
    });

    // Calculate statistical significance (simplified)
    const statisticalSignificance: Record<string, any> = {};
    const controlRate = conversionRates[test.variations.control] || 0;

    test.variations.treatment.forEach((treatmentId) => {
      const treatmentRate = conversionRates[treatmentId] || 0;
      const pValue = this.calculatePValue(
        controlRate,
        treatmentRate,
        sampleSize[test.variations.control],
        sampleSize[treatmentId],
      );

      statisticalSignificance[treatmentId] = {
        pValue,
        confidence: (1 - pValue) * 100,
        significantlyDifferent: pValue < 1 - test.significance.threshold,
      };
    });

    // Determine recommendation
    let recommendation: ABTestResults['recommendation'] = 'run_longer';

    // Simplified recommendation logic
    const hasSignificantResults = Object.values(statisticalSignificance).some(
      (s) => s.significantlyDifferent,
    );

    if (hasSignificantResults) {
      const bestTreatment = test.variations.treatment.reduce((best, current) =>
        conversionRates[current] > conversionRates[best] ? current : best,
      );

      recommendation =
        conversionRates[bestTreatment] > controlRate
          ? 'implement_treatment'
          : 'continue_control';
    }

    return {
      duration: 7, // Mock duration in days
      sampleSize,
      conversionRates,
      statisticalSignificance,
      businessImpact: [], // Would calculate actual business impact
      recommendation,
    };
  }

  /**
   * Calculate p-value for statistical significance (simplified)
   */
  private calculatePValue(
    controlRate: number,
    treatmentRate: number,
    controlSample: number,
    treatmentSample: number,
  ): number {
    // Simplified p-value calculation
    // In production, would use proper statistical libraries
    const pooledRate =
      (controlRate * controlSample + treatmentRate * treatmentSample) /
      (controlSample + treatmentSample);

    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / controlSample + 1 / treatmentSample),
    );

    if (standardError === 0) return 1;

    const zScore = Math.abs(treatmentRate - controlRate) / standardError;

    // Simplified p-value approximation
    return Math.max(0.001, 2 * (1 - this.normalCdf(Math.abs(zScore))));
  }

  /**
   * Approximate normal CDF for p-value calculation
   */
  private normalCdf(x: number): number {
    // Simplified normal CDF approximation
    return (
      0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp((-2 * x * x) / Math.PI)))
    );
  }

  /**
   * Schedule rollout phases
   */
  private async scheduleRolloutPhases(flag: FeatureFlag): Promise<void> {
    if (!flag.rollout.schedule) return;

    console.log(`Scheduling rollout phases for flag ${flag.key}`);

    // Implementation would schedule actual rollout phases
    // using job scheduler or similar mechanism
  }

  /**
   * Alert about rollback
   */
  private alertRollback(flagKey: string, reason: string): void {
    console.error(`EMERGENCY ROLLBACK: Flag ${flagKey} - ${reason}`);

    // Implementation would send alerts to monitoring systems
    // Slack, PagerDuty, etc.
    this.emit('alert:rollback', { flagKey, reason });
  }

  /**
   * Sanitize flag for audit logging
   */
  private sanitizeFlagForAudit(flag: FeatureFlag): any {
    // Remove sensitive information before logging
    return {
      id: flag.id,
      key: flag.key,
      name: flag.name,
      type: flag.type,
      status: flag.status,
      version: flag.metadata.version,
    };
  }

  /**
   * Generate unique flag ID
   */
  private generateFlagId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique test ID
   */
  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
