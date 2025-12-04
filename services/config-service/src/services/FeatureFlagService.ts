import {
  featureFlagRepository,
  segmentRepository,
  auditRepository,
  type AuditContext,
} from '../db/index.js';
import { segmentEvaluator } from './SegmentEvaluator.js';
import { isInRollout } from '../utils/hash.js';
import { logger } from '../utils/logger.js';
import type {
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  AddTargetingRuleInput,
  FlagEvaluationResult,
  EvaluationContext,
  FlagTargetingRule,
} from '../types/index.js';

const log = logger.child({ module: 'FeatureFlagService' });

export class FeatureFlagService {
  /**
   * Evaluate a feature flag for a given context.
   */
  async isEnabled(
    flagKey: string,
    context: EvaluationContext,
    defaultValue: boolean = false,
  ): Promise<boolean> {
    const result = await this.evaluate(flagKey, context);
    if (!result.enabled) {
      return defaultValue;
    }
    return result.value === true;
  }

  /**
   * Get the value of a feature flag for a given context.
   */
  async getValue<T = unknown>(
    flagKey: string,
    context: EvaluationContext,
    defaultValue?: T,
  ): Promise<T> {
    const result = await this.evaluate(flagKey, context);
    if (!result.enabled) {
      return defaultValue as T;
    }
    return result.value as T;
  }

  /**
   * Evaluate a feature flag and return full evaluation result.
   */
  async evaluate(
    flagKey: string,
    context: EvaluationContext,
  ): Promise<FlagEvaluationResult> {
    const flag = await featureFlagRepository.findByKey(
      flagKey,
      context.tenantId ?? null,
    );

    if (!flag) {
      return {
        flagKey,
        value: undefined,
        enabled: false,
        reason: 'FLAG_NOT_FOUND',
        ruleId: null,
        segmentId: null,
      };
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return {
        flagKey,
        value: flag.defaultValue,
        enabled: false,
        reason: 'FLAG_DISABLED',
        ruleId: null,
        segmentId: null,
      };
    }

    // Check blocklist first
    if (flag.blocklist.includes(context.userId)) {
      return {
        flagKey,
        value: flag.defaultValue,
        enabled: false,
        reason: 'USER_BLOCKLISTED',
        ruleId: null,
        segmentId: null,
      };
    }

    // Check allowlist
    if (flag.allowlist.includes(context.userId)) {
      return {
        flagKey,
        value: flag.defaultValue,
        enabled: true,
        reason: 'USER_ALLOWLISTED',
        ruleId: null,
        segmentId: null,
      };
    }

    // Evaluate targeting rules in priority order
    const result = await this.evaluateTargetingRules(flag, context);
    if (result) {
      return result;
    }

    // Return default value
    return {
      flagKey,
      value: flag.defaultValue,
      enabled: true,
      reason: 'DEFAULT_VALUE',
      ruleId: null,
      segmentId: null,
    };
  }

  /**
   * Evaluate targeting rules for a flag.
   */
  private async evaluateTargetingRules(
    flag: FeatureFlag,
    context: EvaluationContext,
  ): Promise<FlagEvaluationResult | null> {
    // Sort by priority (higher first)
    const sortedRules = [...flag.targetingRules].sort(
      (a, b) => b.priority - a.priority,
    );

    for (const rule of sortedRules) {
      const matches = await this.evaluateRule(rule, context);
      if (!matches) continue;

      // Check rollout percentage
      const rolloutKey = `${flag.key}:${context.userId}`;
      if (!isInRollout(rolloutKey, rule.rolloutPercentage)) {
        continue;
      }

      return {
        flagKey: flag.key,
        value: rule.value,
        enabled: true,
        reason: 'TARGETING_RULE_MATCH',
        ruleId: rule.id,
        segmentId: rule.segmentId,
      };
    }

    return null;
  }

  /**
   * Evaluate a single targeting rule.
   */
  private async evaluateRule(
    rule: FlagTargetingRule,
    context: EvaluationContext,
  ): Promise<boolean> {
    // If rule has a segment, evaluate it
    if (rule.segmentId) {
      return segmentEvaluator.matchesSegment(rule.segmentId, context);
    }

    // If rule has inline conditions, evaluate them
    if (rule.inlineConditions && rule.inlineConditions.length > 0) {
      return segmentEvaluator.evaluateConditions(rule.inlineConditions, context);
    }

    // No segment or conditions means match all
    return true;
  }

  /**
   * Batch evaluate multiple flags.
   */
  async evaluateBatch(
    flagKeys: string[],
    context: EvaluationContext,
  ): Promise<Record<string, FlagEvaluationResult>> {
    const results: Record<string, FlagEvaluationResult> = {};

    await Promise.all(
      flagKeys.map(async (key) => {
        results[key] = await this.evaluate(key, context);
      }),
    );

    return results;
  }

  /**
   * Create a new feature flag.
   */
  async createFlag(
    input: CreateFeatureFlagInput,
    auditContext: AuditContext,
  ): Promise<FeatureFlag> {
    const flag = await featureFlagRepository.create(input, auditContext.userId);

    await auditRepository.log(
      'flag',
      flag.id,
      'create',
      auditContext,
      undefined,
      { key: flag.key, enabled: flag.enabled, defaultValue: flag.defaultValue },
    );

    log.info({ key: flag.key, id: flag.id }, 'Feature flag created');
    return flag;
  }

  /**
   * Update a feature flag.
   */
  async updateFlag(
    id: string,
    input: UpdateFeatureFlagInput,
    auditContext: AuditContext,
  ): Promise<FeatureFlag | null> {
    const existing = await featureFlagRepository.findById(id);
    if (!existing) return null;

    if (existing.isGovernanceProtected && input.isGovernanceProtected === false) {
      throw new Error('Cannot remove governance protection from protected flag');
    }

    const updated = await featureFlagRepository.update(
      id,
      input,
      auditContext.userId,
    );
    if (!updated) return null;

    await auditRepository.log(
      'flag',
      id,
      'update',
      auditContext,
      { enabled: existing.enabled, defaultValue: existing.defaultValue },
      { enabled: updated.enabled, defaultValue: updated.defaultValue },
    );

    log.info({ key: updated.key, id }, 'Feature flag updated');
    return updated;
  }

  /**
   * Delete a feature flag.
   */
  async deleteFlag(id: string, auditContext: AuditContext): Promise<boolean> {
    const existing = await featureFlagRepository.findById(id);
    if (!existing) return false;

    if (existing.isGovernanceProtected) {
      throw new Error('Cannot delete governance-protected flag');
    }

    const deleted = await featureFlagRepository.delete(id);
    if (deleted) {
      await auditRepository.log(
        'flag',
        id,
        'delete',
        auditContext,
        { key: existing.key },
        undefined,
      );
      log.info({ key: existing.key, id }, 'Feature flag deleted');
    }

    return deleted;
  }

  /**
   * Toggle a feature flag.
   */
  async toggleFlag(
    id: string,
    enabled: boolean,
    auditContext: AuditContext,
  ): Promise<FeatureFlag | null> {
    const existing = await featureFlagRepository.findById(id);
    if (!existing) return null;

    const updated = await featureFlagRepository.toggle(
      id,
      enabled,
      auditContext.userId,
    );
    if (!updated) return null;

    await auditRepository.log(
      'flag',
      id,
      enabled ? 'enable' : 'disable',
      auditContext,
      { enabled: existing.enabled },
      { enabled: updated.enabled },
    );

    log.info({ key: updated.key, id, enabled }, 'Feature flag toggled');
    return updated;
  }

  /**
   * Add a targeting rule to a flag.
   */
  async addTargetingRule(
    flagId: string,
    input: AddTargetingRuleInput,
    auditContext: AuditContext,
  ): Promise<FeatureFlag | null> {
    const flag = await featureFlagRepository.findById(flagId);
    if (!flag) return null;

    // Validate segment exists if specified
    if (input.segmentId) {
      const segment = await segmentRepository.findById(input.segmentId);
      if (!segment) {
        throw new Error(`Segment ${input.segmentId} not found`);
      }
    }

    await featureFlagRepository.addTargetingRule(flagId, input);

    const updated = await featureFlagRepository.findById(flagId);

    await auditRepository.log(
      'flag',
      flagId,
      'update',
      auditContext,
      { targetingRulesCount: flag.targetingRules.length },
      { targetingRulesCount: updated?.targetingRules.length ?? 0 },
    );

    log.info({ flagId, segmentId: input.segmentId }, 'Targeting rule added');
    return updated;
  }

  /**
   * Remove a targeting rule from a flag.
   */
  async removeTargetingRule(
    flagId: string,
    ruleId: string,
    auditContext: AuditContext,
  ): Promise<FeatureFlag | null> {
    const flag = await featureFlagRepository.findById(flagId);
    if (!flag) return null;

    await featureFlagRepository.removeTargetingRule(flagId, ruleId);

    const updated = await featureFlagRepository.findById(flagId);

    await auditRepository.log(
      'flag',
      flagId,
      'update',
      auditContext,
      { targetingRulesCount: flag.targetingRules.length },
      { targetingRulesCount: updated?.targetingRules.length ?? 0 },
    );

    log.info({ flagId, ruleId }, 'Targeting rule removed');
    return updated;
  }

  /**
   * Get a flag by ID.
   */
  async getFlag(id: string): Promise<FeatureFlag | null> {
    return featureFlagRepository.findById(id);
  }

  /**
   * Get a flag by key.
   */
  async getFlagByKey(
    key: string,
    tenantId: string | null,
  ): Promise<FeatureFlag | null> {
    return featureFlagRepository.findByKey(key, tenantId);
  }

  /**
   * List flags for a tenant.
   */
  async listFlags(
    tenantId: string | null,
    options?: { limit?: number; offset?: number; includeGlobal?: boolean },
  ) {
    return featureFlagRepository.listByTenant(tenantId, options);
  }
}

export const featureFlagService = new FeatureFlagService();
