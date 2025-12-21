// IntelGraph Autonomous Orchestrator - Policy Engine Integration
// Implements OPA/Rego policy enforcement for action authorization and safety gates
// Version: 1.0.0

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import axios, { AxiosInstance } from 'axios';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface PolicyDecision {
  allow: boolean;
  deny?: boolean;
  reason?: string;
  obligations?: string[];
  metadata?: Record<string, any>;
}

interface PolicyInput {
  subject: {
    userId: string;
    tenantId: string;
    roles: string[];
    attributes?: Record<string, any>;
  };
  action: {
    type: string;
    resource: string;
    category: 'READ' | 'WRITE' | 'DEPLOY' | 'ROLLBACK';
    params?: Record<string, any>;
  };
  resource: {
    type: string;
    id: string;
    attributes?: Record<string, any>;
  };
  context: {
    time: string;
    environment: string;
    autonomyLevel: number;
    budgetRemaining: number;
    correlationId?: string;
    reasonForAccess?: string;
  };
}

interface PolicyRule {
  id: string;
  name: string;
  version: string;
  category: 'SAFETY' | 'BUDGET' | 'APPROVAL' | 'SECURITY' | 'AUDIT';
  priority: number;
  enabled: boolean;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  rego_rule?: string;
  metadata: Record<string, any>;
}

interface PolicyEvaluationResult {
  decision: PolicyDecision;
  evaluatedRules: PolicyRule[];
  evaluationTime: number;
  cached: boolean;
}

interface PolicyEngineConfig {
  opaUrl: string;
  opaTimeout: number;
  cacheTtlSeconds: number;
  enableCaching: boolean;
  enableMetrics: boolean;
  defaultDecision: 'allow' | 'deny';
  reasonForAccessRequired: boolean;
}

export class PolicyEngine {
  private pool: Pool;
  private redis: Redis;
  private opaClient: AxiosInstance;
  private config: PolicyEngineConfig;
  private policyCache = new Map<
    string,
    { decision: PolicyDecision; timestamp: number }
  >();

  constructor(
    pool: Pool,
    redis: Redis,
    config: Partial<PolicyEngineConfig> = {},
  ) {
    this.pool = pool;
    this.redis = redis;

    this.config = {
      opaUrl: config.opaUrl || 'http://localhost:8181',
      opaTimeout: config.opaTimeout || 5000,
      cacheTtlSeconds: config.cacheTtlSeconds || 300,
      enableCaching: config.enableCaching ?? true,
      enableMetrics: config.enableMetrics ?? true,
      defaultDecision: config.defaultDecision || 'deny',
      reasonForAccessRequired: config.reasonForAccessRequired ?? true,
    };

    this.opaClient = axios.create({
      baseURL: this.config.opaUrl,
      timeout: this.config.opaTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('PolicyEngine initialized', {
      opaUrl: this.config.opaUrl,
      config: this.config,
    });
  }

  /**
   * Evaluate policy for an orchestration action
   */
  async evaluatePolicy(input: PolicyInput): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(input);

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = await this.getCachedDecision(cacheKey);
        if (cached) {
          logger.debug('Policy decision from cache', {
            cacheKey,
            decision: cached.decision,
            correlationId: input.context.correlationId,
          });

          return {
            decision: cached.decision,
            evaluatedRules: [],
            evaluationTime: Date.now() - startTime,
            cached: true,
          };
        }
      }

      // Validate required fields
      await this.validateInput(input);

      // Load applicable policy rules
      const applicableRules = await this.loadApplicableRules(input);

      // Evaluate with OPA
      const decision = await this.evaluateWithOPA(input, applicableRules);

      // Cache the decision
      if (this.config.enableCaching) {
        await this.cacheDecision(cacheKey, decision);
      }

      // Record audit event
      await this.recordPolicyEvaluation(input, decision, applicableRules);

      const evaluationTime = Date.now() - startTime;

      // Record metrics
      if (this.config.enableMetrics) {
        prometheusConductorMetrics.recordOperationalMetric(
          'policy_evaluation_duration_ms',
          evaluationTime,
          {
            decision: decision.allow ? 'allow' : 'deny',
            action_type: input.action.type,
            category: input.action.category,
          },
        );

        prometheusConductorMetrics.recordOperationalEvent(
          'policy_evaluation',
          decision.allow,
          {
            action_type: input.action.type,
            category: input.action.category,
            tenant_id: input.subject.tenantId,
          },
        );
      }

      logger.info('Policy evaluation completed', {
        decision: decision.allow ? 'ALLOW' : 'DENY',
        evaluationTime,
        actionType: input.action.type,
        userId: input.subject.userId,
        correlationId: input.context.correlationId,
        reason: decision.reason,
      });

      return {
        decision,
        evaluatedRules: applicableRules,
        evaluationTime,
        cached: false,
      };
    } catch (error) {
      const evaluationTime = Date.now() - startTime;

      logger.error('Policy evaluation failed', {
        error: error.message,
        evaluationTime,
        actionType: input.action.type,
        userId: input.subject.userId,
        correlationId: input.context.correlationId,
      });

      if (this.config.enableMetrics) {
        prometheusConductorMetrics.recordOperationalEvent(
          'policy_evaluation_error',
          false,
          {
            error_type: error.name,
            action_type: input.action.type,
          },
        );
      }

      // Return default decision on error
      const defaultDecision: PolicyDecision = {
        allow: this.config.defaultDecision === 'allow',
        reason: `Policy evaluation failed: ${error.message}`,
        metadata: { error: true, defaultDecision: true },
      };

      return {
        decision: defaultDecision,
        evaluatedRules: [],
        evaluationTime,
        cached: false,
      };
    }
  }

  /**
   * Validate policy input
   */
  private async validateInput(input: PolicyInput): Promise<void> {
    const errors: string[] = [];

    if (!input.subject.userId) errors.push('subject.userId is required');
    if (!input.subject.tenantId) errors.push('subject.tenantId is required');
    if (!input.action.type) errors.push('action.type is required');
    if (!input.action.category) errors.push('action.category is required');
    if (!input.resource.type) errors.push('resource.type is required');
    if (!input.resource.id) errors.push('resource.id is required');
    if (input.context.autonomyLevel < 0 || input.context.autonomyLevel > 5) {
      errors.push('context.autonomyLevel must be between 0 and 5');
    }

    // Check if reason for access is required for privileged operations
    if (
      this.config.reasonForAccessRequired &&
      ['WRITE', 'DEPLOY', 'ROLLBACK'].includes(input.action.category) &&
      !input.context.reasonForAccess
    ) {
      errors.push('reasonForAccess is required for privileged operations');
    }

    if (errors.length > 0) {
      throw new Error(`Policy input validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Load applicable policy rules from database
   */
  private async loadApplicableRules(input: PolicyInput): Promise<PolicyRule[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT id, name, version, category, priority, enabled, conditions, actions, metadata
         FROM orchestration_policies
         WHERE enabled = true
           AND (effective_from IS NULL OR effective_from <= NOW())
           AND (effective_until IS NULL OR effective_until > NOW())
         ORDER BY priority ASC, created_at ASC`,
      );

      const allRules = result.rows.map((row) => ({
        ...row,
        conditions:
          typeof row.conditions === 'string'
            ? JSON.parse(row.conditions)
            : row.conditions,
        actions:
          typeof row.actions === 'string'
            ? JSON.parse(row.actions)
            : row.actions,
        metadata:
          typeof row.metadata === 'string'
            ? JSON.parse(row.metadata)
            : row.metadata,
      }));

      // Filter rules that are applicable to this request
      const applicableRules = allRules.filter((rule) =>
        this.isRuleApplicable(rule, input),
      );

      logger.debug('Loaded applicable policy rules', {
        totalRules: allRules.length,
        applicableRules: applicableRules.length,
        actionType: input.action.type,
        category: input.action.category,
      });

      return applicableRules;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a policy rule is applicable to the current input
   */
  private isRuleApplicable(rule: PolicyRule, input: PolicyInput): boolean {
    const conditions = rule.conditions;

    // Check action type
    if (
      conditions.action_types &&
      !conditions.action_types.includes(input.action.type)
    ) {
      return false;
    }

    // Check action category
    if (
      conditions.action_categories &&
      !conditions.action_categories.includes(input.action.category)
    ) {
      return false;
    }

    // Check autonomy level
    if (
      conditions.max_autonomy_level !== undefined &&
      input.context.autonomyLevel > conditions.max_autonomy_level
    ) {
      return false;
    }

    // Check tenant
    if (
      conditions.tenants &&
      !conditions.tenants.includes(input.subject.tenantId)
    ) {
      return false;
    }

    // Check resource type
    if (
      conditions.resource_types &&
      !conditions.resource_types.includes(input.resource.type)
    ) {
      return false;
    }

    // Check environment
    if (
      conditions.environments &&
      !conditions.environments.includes(input.context.environment)
    ) {
      return false;
    }

    // Check time-based conditions
    if (conditions.time_restrictions) {
      const currentHour = new Date().getHours();
      const allowedHours = conditions.time_restrictions.allowed_hours;
      if (allowedHours && !allowedHours.includes(currentHour)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate policy using OPA
   */
  private async evaluateWithOPA(
    input: PolicyInput,
    applicableRules: PolicyRule[],
  ): Promise<PolicyDecision> {
    try {
      // Prepare OPA input
      const opaInput = {
        input: {
          ...input,
          applicable_rules: applicableRules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            category: rule.category,
            conditions: rule.conditions,
            actions: rule.actions,
          })),
        },
      };

      // Make request to OPA
      const response = await this.opaClient.post(
        '/v1/data/orchestrator/allow',
        opaInput,
      );

      const result = response.data.result;

      if (typeof result === 'boolean') {
        return {
          allow: result,
          reason: result ? 'Policy allows action' : 'Policy denies action',
        };
      }

      if (typeof result === 'object' && result !== null) {
        return {
          allow: result.allow || false,
          deny: result.deny || false,
          reason:
            result.reason ||
            (result.allow ? 'Policy allows action' : 'Policy denies action'),
          obligations: result.obligations || [],
          metadata: result.metadata || {},
        };
      }

      throw new Error('Invalid OPA response format');
    } catch (error) {
      if (error.response) {
        logger.error('OPA evaluation failed', {
          status: error.response.status,
          data: error.response.data,
          actionType: input.action.type,
        });
      } else {
        logger.error('OPA request failed', {
          error: error.message,
          actionType: input.action.type,
        });
      }

      // Fallback to local evaluation
      return await this.evaluateLocally(input, applicableRules);
    }
  }

  /**
   * Fallback local policy evaluation
   */
  private async evaluateLocally(
    input: PolicyInput,
    applicableRules: PolicyRule[],
  ): Promise<PolicyDecision> {
    logger.warn('Falling back to local policy evaluation', {
      actionType: input.action.type,
      rulesCount: applicableRules.length,
    });

    // Basic safety checks
    for (const rule of applicableRules) {
      if (rule.category === 'SAFETY') {
        const conditions = rule.conditions;

        // Check blocked actions
        if (
          conditions.blocked_actions &&
          conditions.blocked_actions.includes(input.action.type)
        ) {
          return {
            allow: false,
            reason: `Action ${input.action.type} is blocked by safety policy ${rule.name}`,
          };
        }

        // Check autonomy level limits
        if (
          conditions.max_autonomy_level !== undefined &&
          input.context.autonomyLevel > conditions.max_autonomy_level
        ) {
          return {
            allow: false,
            reason: `Autonomy level ${input.context.autonomyLevel} exceeds maximum ${conditions.max_autonomy_level}`,
          };
        }

        // Check budget limits
        if (
          conditions.max_budget_per_run !== undefined &&
          input.context.budgetRemaining < 0
        ) {
          return {
            allow: false,
            reason: 'Budget exhausted, action not permitted',
          };
        }
      }

      // Check approval requirements
      if (rule.category === 'APPROVAL') {
        const conditions = rule.conditions;

        if (conditions.require_approval_for) {
          const requireApproval = conditions.require_approval_for;

          if (
            requireApproval.autonomy_levels &&
            requireApproval.autonomy_levels.includes(
              input.context.autonomyLevel,
            )
          ) {
            return {
              allow: false,
              reason: `Autonomy level ${input.context.autonomyLevel} requires approval`,
              obligations: ['REQUIRE_APPROVAL'],
            };
          }

          if (
            requireApproval.high_cost_actions &&
            input.context.budgetRemaining < requireApproval.high_cost_actions
          ) {
            return {
              allow: false,
              reason: 'High cost action requires approval',
              obligations: ['REQUIRE_APPROVAL'],
            };
          }

          if (
            requireApproval.production_deployments &&
            input.action.category === 'DEPLOY' &&
            input.context.environment === 'production'
          ) {
            return {
              allow: false,
              reason: 'Production deployment requires approval',
              obligations: ['REQUIRE_APPROVAL'],
            };
          }
        }
      }
    }

    // Default allow for non-privileged operations
    if (input.action.category === 'READ' && input.context.autonomyLevel <= 2) {
      return {
        allow: true,
        reason: 'Read operation with low autonomy level allowed',
      };
    }

    // Default deny for everything else in fallback mode
    return {
      allow: false,
      reason: 'Local policy evaluation: default deny for safety',
    };
  }

  /**
   * Generate cache key for policy decision
   */
  private generateCacheKey(input: PolicyInput): string {
    const keyData = {
      userId: input.subject.userId,
      tenantId: input.subject.tenantId,
      roles: input.subject.roles.sort(),
      actionType: input.action.type,
      actionCategory: input.action.category,
      resourceType: input.resource.type,
      resourceId: input.resource.id,
      autonomyLevel: input.context.autonomyLevel,
      environment: input.context.environment,
    };

    return `policy:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Get cached policy decision
   */
  private async getCachedDecision(
    cacheKey: string,
  ): Promise<{ decision: PolicyDecision } | null> {
    try {
      if (this.policyCache.has(cacheKey)) {
        const cached = this.policyCache.get(cacheKey)!;
        if (
          Date.now() - cached.timestamp <
          this.config.cacheTtlSeconds * 1000
        ) {
          return { decision: cached.decision };
        } else {
          this.policyCache.delete(cacheKey);
        }
      }

      const redisResult = await this.redis.get(cacheKey);
      if (redisResult) {
        const cached = JSON.parse(redisResult);

        // Store in local cache too
        this.policyCache.set(cacheKey, {
          decision: cached.decision,
          timestamp: Date.now(),
        });

        return { decision: cached.decision };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get cached policy decision', {
        error: error.message,
        cacheKey,
      });
      return null;
    }
  }

  /**
   * Cache policy decision
   */
  private async cacheDecision(
    cacheKey: string,
    decision: PolicyDecision,
  ): Promise<void> {
    try {
      const cacheData = {
        decision,
        timestamp: Date.now(),
      };

      // Store in local cache
      this.policyCache.set(cacheKey, {
        decision,
        timestamp: Date.now(),
      });

      // Store in Redis with TTL
      await this.redis.setex(
        cacheKey,
        this.config.cacheTtlSeconds,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      logger.error('Failed to cache policy decision', {
        error: error.message,
        cacheKey,
      });
    }
  }

  /**
   * Record policy evaluation for audit
   */
  private async recordPolicyEvaluation(
    input: PolicyInput,
    decision: PolicyDecision,
    evaluatedRules: PolicyRule[],
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `INSERT INTO orchestration_events (
          event_type, level, message, payload, correlation_id, source_service
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'policy.evaluation',
          decision.allow ? 'INFO' : 'WARN',
          `Policy evaluation: ${decision.allow ? 'ALLOW' : 'DENY'} - ${decision.reason}`,
          JSON.stringify({
            decision,
            input: {
              subject: {
                userId: input.subject.userId,
                tenantId: input.subject.tenantId,
              },
              action: input.action,
              resource: { type: input.resource.type, id: input.resource.id },
              context: input.context,
            },
            evaluatedRules: evaluatedRules.map((rule) => ({
              id: rule.id,
              name: rule.name,
              category: rule.category,
            })),
          }),
          input.context.correlationId,
          'policy-engine',
        ],
      );
    } catch (error) {
      logger.error('Failed to record policy evaluation', {
        error: error.message,
        correlationId: input.context.correlationId,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Create new policy rule
   */
  async createPolicyRule(
    name: string,
    category: 'SAFETY' | 'BUDGET' | 'APPROVAL' | 'SECURITY' | 'AUDIT',
    rules: Record<string, any>,
    createdBy: string,
    options: {
      version?: string;
      priority?: number;
      conditions?: Record<string, any>;
      actions?: Record<string, any>;
      metadata?: Record<string, any>;
      effectiveFrom?: Date;
      effectiveUntil?: Date;
    } = {},
  ): Promise<string> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `INSERT INTO orchestration_policies (
          name, version, category, rules, created_by, priority, conditions, actions, metadata,
          effective_from, effective_until
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          name,
          options.version || '1.0.0',
          category,
          JSON.stringify(rules),
          createdBy,
          options.priority || 100,
          JSON.stringify(options.conditions || {}),
          JSON.stringify(options.actions || {}),
          JSON.stringify(options.metadata || {}),
          options.effectiveFrom || new Date(),
          options.effectiveUntil,
        ],
      );

      const policyId = result.rows[0].id;

      logger.info('Policy rule created', {
        policyId,
        name,
        category,
        createdBy,
      });

      // Clear policy cache
      await this.clearPolicyCache();

      return policyId;
    } finally {
      client.release();
    }
  }

  /**
   * Update policy rule
   */
  async updatePolicyRule(
    policyId: string,
    updates: {
      enabled?: boolean;
      rules?: Record<string, any>;
      conditions?: Record<string, any>;
      actions?: Record<string, any>;
      metadata?: Record<string, any>;
      priority?: number;
    },
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.enabled !== undefined) {
        setClause.push(`enabled = $${paramIndex++}`);
        values.push(updates.enabled);
      }

      if (updates.rules) {
        setClause.push(`rules = $${paramIndex++}`);
        values.push(JSON.stringify(updates.rules));
      }

      if (updates.conditions) {
        setClause.push(`conditions = $${paramIndex++}`);
        values.push(JSON.stringify(updates.conditions));
      }

      if (updates.actions) {
        setClause.push(`actions = $${paramIndex++}`);
        values.push(JSON.stringify(updates.actions));
      }

      if (updates.metadata) {
        setClause.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      if (updates.priority !== undefined) {
        setClause.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }

      setClause.push(`updated_at = NOW()`);
      values.push(policyId);

      await client.query(
        `UPDATE orchestration_policies SET ${setClause.join(', ')} WHERE id = $${paramIndex}`,
        values,
      );

      logger.info('Policy rule updated', { policyId, updates });

      // Clear policy cache
      await this.clearPolicyCache();
    } finally {
      client.release();
    }
  }

  /**
   * Delete policy rule
   */
  async deletePolicyRule(policyId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('DELETE FROM orchestration_policies WHERE id = $1', [
        policyId,
      ]);

      logger.info('Policy rule deleted', { policyId });

      // Clear policy cache
      await this.clearPolicyCache();
    } finally {
      client.release();
    }
  }

  /**
   * Clear policy cache
   */
  async clearPolicyCache(): Promise<void> {
    try {
      // Clear local cache
      this.policyCache.clear();

      // Clear Redis cache
      const keys = await this.redis.keys('policy:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      logger.info('Policy cache cleared');
    } catch (error) {
      logger.error('Failed to clear policy cache', { error: error.message });
    }
  }

  /**
   * Get policy statistics
   */
  async getPolicyStats(): Promise<{
    totalRules: number;
    enabledRules: number;
    rulesByCategory: Record<string, number>;
    cacheHitRate: number;
    evaluationsLast24h: number;
  }> {
    const client = await this.pool.connect();

    try {
      const [rulesResult, eventsResult] = await Promise.all([
        client.query(
          'SELECT category, enabled, COUNT(*) as count FROM orchestration_policies GROUP BY category, enabled',
        ),
        client.query(
          "SELECT COUNT(*) as count FROM orchestration_events WHERE event_type = 'policy.evaluation' AND timestamp > NOW() - INTERVAL '24 hours'",
        ),
      ]);

      let totalRules = 0;
      let enabledRules = 0;
      const rulesByCategory: Record<string, number> = {};

      rulesResult.rows.forEach((row) => {
        const count = parseInt(row.count);
        totalRules += count;

        if (row.enabled) {
          enabledRules += count;
        }

        rulesByCategory[row.category] =
          (rulesByCategory[row.category] || 0) + count;
      });

      const evaluationsLast24h = parseInt(eventsResult.rows[0].count);

      return {
        totalRules,
        enabledRules,
        rulesByCategory,
        cacheHitRate: 0, // Would need to track this with metrics
        evaluationsLast24h,
      };
    } finally {
      client.release();
    }
  }
}

// Utility functions for policy enforcement

export async function enforcePolicy(
  policyEngine: PolicyEngine,
  input: PolicyInput,
): Promise<void> {
  const result = await policyEngine.evaluatePolicy(input);

  if (!result.decision.allow) {
    const error = new Error(result.decision.reason || 'Policy denied');
    error.name = 'PolicyDeniedError';
    throw error;
  }

  // Handle obligations
  if (result.decision.obligations && result.decision.obligations.length > 0) {
    logger.info('Policy obligations required', {
      obligations: result.decision.obligations,
      actionType: input.action.type,
      correlationId: input.context.correlationId,
    });

    // Could trigger approval workflows, notifications, etc.
  }
}

export function createPolicyInput(
  userId: string,
  tenantId: string,
  action: {
    type: string;
    category: 'READ' | 'WRITE' | 'DEPLOY' | 'ROLLBACK';
    params?: Record<string, any>;
  },
  resource: { type: string; id: string; attributes?: Record<string, any> },
  context: {
    environment: string;
    autonomyLevel: number;
    budgetRemaining: number;
    correlationId?: string;
    reasonForAccess?: string;
    userRoles?: string[];
    userAttributes?: Record<string, any>;
  },
): PolicyInput {
  return {
    subject: {
      userId,
      tenantId,
      roles: context.userRoles || [],
      attributes: context.userAttributes || {},
    },
    action,
    resource,
    context: {
      time: new Date().toISOString(),
      environment: context.environment,
      autonomyLevel: context.autonomyLevel,
      budgetRemaining: context.budgetRemaining,
      correlationId: context.correlationId,
      reasonForAccess: context.reasonForAccess,
    },
  };
}

export default PolicyEngine;
