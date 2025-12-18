/**
 * Governance Integration Client
 *
 * Integrates with the central governance service to:
 * - Determine privacy profiles per tenant/use-case
 * - Fetch applicable privacy policies
 * - Validate query authorization
 */

import type {
  PrivacyProfile,
  PrivacyPolicy,
  GovernanceDecision,
  AggregateQuery,
  DataSource,
  ExecutionContext,
  KAnonymityConfig,
  DifferentialPrivacyConfig,
  SuppressionConfig,
  RateLimitConfig,
} from '../types/index.js';
import { PrivacyMechanism } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

/**
 * OPA decision response
 */
interface OPADecisionResponse {
  result?: {
    allowed: boolean;
    reason?: string;
    policy_ids?: string[];
    modifications?: {
      remove_dimensions?: string[];
      remove_measures?: string[];
      add_filters?: unknown[];
      limit_override?: number;
    };
  };
}

/**
 * Governance service health status
 */
interface GovernanceHealth {
  governanceService: 'healthy' | 'unhealthy' | 'unavailable';
  opaService: 'healthy' | 'unhealthy' | 'unavailable';
}

export class GovernanceClient {
  private baseUrl: string;
  private opaEndpoint: string;
  private profileCache: Map<string, { profile: PrivacyProfile; expiresAt: Date }> = new Map();
  private policyCache: Map<string, { policies: PrivacyPolicy[]; expiresAt: Date }> = new Map();
  private cacheTtlMs: number = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl?: string, opaEndpoint?: string) {
    this.baseUrl = baseUrl || config.governance.serviceUrl;
    this.opaEndpoint = opaEndpoint || config.governance.opaEndpoint;
  }

  /**
   * Get privacy profile for a tenant/use-case
   */
  async getPrivacyProfile(
    tenantId: string,
    useCase?: string
  ): Promise<PrivacyProfile> {
    const cacheKey = `${tenantId}:${useCase || 'default'}`;

    // Check cache
    const cached = this.profileCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.profile;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/privacy-profiles/${tenantId}${useCase ? `?useCase=${useCase}` : ''}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const profile = await response.json() as PrivacyProfile;
        this.profileCache.set(cacheKey, {
          profile,
          expiresAt: new Date(Date.now() + this.cacheTtlMs),
        });
        return profile;
      }

      // Fallback to default profile if not found
      logger.warn({ tenantId, useCase }, 'Privacy profile not found, using default');
      return this.getDefaultProfile(tenantId);
    } catch (error) {
      logger.error({ error, tenantId }, 'Failed to fetch privacy profile');
      return this.getDefaultProfile(tenantId);
    }
  }

  /**
   * Get applicable privacy policies for a query
   */
  async getPolicies(
    tenantId: string,
    source: DataSource
  ): Promise<PrivacyPolicy[]> {
    const cacheKey = `${tenantId}:${source}`;

    // Check cache
    const cached = this.policyCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.policies;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/privacy-policies?tenantId=${tenantId}&source=${source}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const policies = await response.json() as PrivacyPolicy[];
        this.policyCache.set(cacheKey, {
          policies,
          expiresAt: new Date(Date.now() + this.cacheTtlMs),
        });
        return policies;
      }

      logger.warn({ tenantId, source }, 'Failed to fetch policies, using defaults');
      return this.getDefaultPolicies(source);
    } catch (error) {
      logger.error({ error, tenantId }, 'Failed to fetch privacy policies');
      return this.getDefaultPolicies(source);
    }
  }

  /**
   * Evaluate query authorization with OPA
   */
  async evaluateAuthorization(
    query: AggregateQuery,
    context: ExecutionContext
  ): Promise<GovernanceDecision> {
    try {
      const opaInput = {
        input: {
          query: {
            source: query.source,
            dimensions: query.dimensions.map(d => d.field),
            measures: query.measures.map(m => ({
              field: m.field,
              aggregation: m.aggregation,
            })),
            hasFilters: !!query.filters,
            hasTimeRange: !!query.timeRange,
          },
          context: {
            tenantId: context.tenantId,
            userId: context.userId,
            roles: context.roles,
            timestamp: context.timestamp.toISOString(),
          },
        },
      };

      const response = await fetch(
        `${this.opaEndpoint}/v1/data/privacy/analytics/allow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(opaInput),
        }
      );

      if (response.ok) {
        const opaResult = await response.json() as OPADecisionResponse;
        return this.parseOPADecision(opaResult);
      }

      // OPA unavailable - default allow with logging
      logger.warn({ tenantId: context.tenantId }, 'OPA unavailable, allowing query with default policies');
      return {
        allowed: true,
        additionalPolicies: [],
      };
    } catch (error) {
      logger.error({ error }, 'OPA evaluation failed');
      // Fail open with warning (configurable)
      return {
        allowed: true,
        reason: 'OPA evaluation failed, default allow applied',
      };
    }
  }

  /**
   * Build execution context with policies from governance
   */
  async buildExecutionContext(
    tenantId: string,
    userId: string,
    roles: string[],
    query: AggregateQuery,
    useCase?: string
  ): Promise<ExecutionContext> {
    // Get profile and policies in parallel
    const [profile, policies, authDecision] = await Promise.all([
      this.getPrivacyProfile(tenantId, useCase),
      this.getPolicies(tenantId, query.source),
      this.evaluateAuthorization(query, {
        executionId: '',
        tenantId,
        userId,
        roles,
        policies: [],
        timestamp: new Date(),
      }),
    ]);

    // Check authorization
    if (!authDecision.allowed) {
      throw new Error(authDecision.reason || 'Query not authorized');
    }

    // Filter policies based on profile and auth decision
    let applicablePolicies = policies.filter(p =>
      profile.defaultPolicies.includes(p.id) ||
      authDecision.additionalPolicies?.includes(p.id)
    );

    // If no specific policies, use all tenant policies
    if (applicablePolicies.length === 0) {
      applicablePolicies = policies;
    }

    return {
      executionId: '', // Will be set by executor
      tenantId,
      userId,
      roles,
      policies: applicablePolicies,
      budgetState: {
        tenantId,
        userId,
        totalBudget: profile.budgetAllocation.epsilon,
        spentBudget: 0, // Will be fetched from DP engine
        queryCount: 0,
        periodStart: new Date(),
        periodEnd: this.calculatePeriodEnd(profile.budgetAllocation.renewalPeriod),
      },
      timestamp: new Date(),
      metadata: {
        profile: profile.id,
        useCase,
      },
    };
  }

  /**
   * Check health of governance services
   */
  async checkHealth(): Promise<GovernanceHealth> {
    const results: GovernanceHealth = {
      governanceService: 'unavailable',
      opaService: 'unavailable',
    };

    // Check governance service
    try {
      const govResponse = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      results.governanceService = govResponse.ok ? 'healthy' : 'unhealthy';
    } catch {
      results.governanceService = 'unavailable';
    }

    // Check OPA
    try {
      const opaResponse = await fetch(`${this.opaEndpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      results.opaService = opaResponse.ok ? 'healthy' : 'unhealthy';
    } catch {
      results.opaService = 'unavailable';
    }

    return results;
  }

  /**
   * Parse OPA decision response
   */
  private parseOPADecision(response: OPADecisionResponse): GovernanceDecision {
    const result = response.result;

    if (!result) {
      return { allowed: true }; // Default allow if no result
    }

    return {
      allowed: result.allowed ?? true,
      reason: result.reason,
      additionalPolicies: result.policy_ids,
      queryModifications: result.modifications
        ? {
            removeDimensions: result.modifications.remove_dimensions,
            removeMeasures: result.modifications.remove_measures,
            limitOverride: result.modifications.limit_override,
          }
        : undefined,
    };
  }

  /**
   * Get default privacy profile
   */
  private getDefaultProfile(tenantId: string): PrivacyProfile {
    return {
      id: 'default',
      name: 'Default Privacy Profile',
      tenantId,
      defaultPolicies: ['default-kanon', 'default-dp'],
      budgetAllocation: {
        epsilon: config.privacy.defaultEpsilon,
        renewalPeriod: 'day',
      },
      rateLimits: {
        maxQueries: config.privacy.defaultMaxQueriesPerHour,
        windowMs: 60 * 60 * 1000, // 1 hour
        complexityWeighted: false,
      },
      allowedSources: ['entities', 'relationships', 'cases', 'events', 'audit_log', 'user_activity'],
      blockedDimensions: [],
      blockedMeasures: [],
      maxResultRows: 10000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get default privacy policies
   */
  private getDefaultPolicies(source: DataSource): PrivacyPolicy[] {
    const now = new Date();

    const kAnonymityPolicy: PrivacyPolicy = {
      id: 'default-kanon',
      name: 'Default K-Anonymity Policy',
      description: 'Ensures minimum cohort size of 5 for all queries',
      enabled: config.privacy.enableKAnonymity,
      mechanism: PrivacyMechanism.K_ANONYMITY,
      kAnonymity: {
        minCohortSize: config.privacy.defaultMinCohortSize,
        violationAction: 'suppress',
      },
      applicableSources: [source],
      priority: 100,
      auditLevel: 'summary',
      createdAt: now,
      updatedAt: now,
    };

    const dpPolicy: PrivacyPolicy = {
      id: 'default-dp',
      name: 'Default Differential Privacy Policy',
      description: 'Applies Laplace mechanism with epsilon=1.0',
      enabled: config.privacy.enableDifferentialPrivacy,
      mechanism: PrivacyMechanism.DIFFERENTIAL_PRIVACY,
      differentialPrivacy: {
        epsilon: config.privacy.defaultEpsilon,
        mechanism: 'laplace',
        budgetTracking: true,
        budgetRenewalPeriod: 'day',
      },
      applicableSources: [source],
      priority: 90,
      auditLevel: 'detailed',
      createdAt: now,
      updatedAt: now,
    };

    const suppressionPolicy: PrivacyPolicy = {
      id: 'default-suppression',
      name: 'Default Suppression Policy',
      description: 'Suppresses results with counts below 3',
      enabled: true,
      mechanism: PrivacyMechanism.SUPPRESSION,
      suppression: {
        minCountThreshold: 3,
        showSuppressed: false,
      },
      applicableSources: [source],
      priority: 80,
      auditLevel: 'summary',
      createdAt: now,
      updatedAt: now,
    };

    return [kAnonymityPolicy, dpPolicy, suppressionPolicy];
  }

  /**
   * Calculate period end based on renewal period
   */
  private calculatePeriodEnd(period: 'hour' | 'day' | 'week' | 'month'): Date {
    const now = new Date();
    const end = new Date(now);

    switch (period) {
      case 'hour':
        end.setHours(end.getHours() + 1);
        end.setMinutes(0, 0, 0);
        break;
      case 'day':
        end.setDate(end.getDate() + 1);
        end.setHours(0, 0, 0, 0);
        break;
      case 'week':
        end.setDate(end.getDate() + (7 - end.getDay()));
        end.setHours(0, 0, 0, 0);
        break;
      case 'month':
        end.setMonth(end.getMonth() + 1);
        end.setDate(1);
        end.setHours(0, 0, 0, 0);
        break;
    }

    return end;
  }

  /**
   * Clear caches (for testing)
   */
  clearCache(): void {
    this.profileCache.clear();
    this.policyCache.clear();
  }
}

export const governanceClient = new GovernanceClient();
