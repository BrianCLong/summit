"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagService = exports.FeatureFlagService = void 0;
const index_js_1 = require("../db/index.js");
const SegmentEvaluator_js_1 = require("./SegmentEvaluator.js");
const hash_js_1 = require("../utils/hash.js");
const logger_js_1 = require("../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'FeatureFlagService' });
class FeatureFlagService {
    /**
     * Evaluate a feature flag for a given context.
     */
    async isEnabled(flagKey, context, defaultValue = false) {
        const result = await this.evaluate(flagKey, context);
        if (!result.enabled) {
            return defaultValue;
        }
        return result.value === true;
    }
    /**
     * Get the value of a feature flag for a given context.
     */
    async getValue(flagKey, context, defaultValue) {
        const result = await this.evaluate(flagKey, context);
        if (!result.enabled) {
            return defaultValue;
        }
        return result.value;
    }
    /**
     * Evaluate a feature flag and return full evaluation result.
     */
    async evaluate(flagKey, context) {
        const flag = await index_js_1.featureFlagRepository.findByKey(flagKey, context.tenantId ?? null);
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
    async evaluateTargetingRules(flag, context) {
        // Sort by priority (higher first)
        const sortedRules = [...flag.targetingRules].sort((a, b) => b.priority - a.priority);
        for (const rule of sortedRules) {
            const matches = await this.evaluateRule(rule, context);
            if (!matches)
                continue;
            // Check rollout percentage
            const rolloutKey = `${flag.key}:${context.userId}`;
            if (!(0, hash_js_1.isInRollout)(rolloutKey, rule.rolloutPercentage)) {
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
    async evaluateRule(rule, context) {
        // If rule has a segment, evaluate it
        if (rule.segmentId) {
            return SegmentEvaluator_js_1.segmentEvaluator.matchesSegment(rule.segmentId, context);
        }
        // If rule has inline conditions, evaluate them
        if (rule.inlineConditions && rule.inlineConditions.length > 0) {
            return SegmentEvaluator_js_1.segmentEvaluator.evaluateConditions(rule.inlineConditions, context);
        }
        // No segment or conditions means match all
        return true;
    }
    /**
     * Batch evaluate multiple flags.
     */
    async evaluateBatch(flagKeys, context) {
        const results = {};
        await Promise.all(flagKeys.map(async (key) => {
            results[key] = await this.evaluate(key, context);
        }));
        return results;
    }
    /**
     * Create a new feature flag.
     */
    async createFlag(input, auditContext) {
        const flag = await index_js_1.featureFlagRepository.create(input, auditContext.userId);
        await index_js_1.auditRepository.log('flag', flag.id, 'create', auditContext, undefined, { key: flag.key, enabled: flag.enabled, defaultValue: flag.defaultValue });
        log.info({ key: flag.key, id: flag.id }, 'Feature flag created');
        return flag;
    }
    /**
     * Update a feature flag.
     */
    async updateFlag(id, input, auditContext) {
        const existing = await index_js_1.featureFlagRepository.findById(id);
        if (!existing)
            return null;
        if (existing.isGovernanceProtected && input.isGovernanceProtected === false) {
            throw new Error('Cannot remove governance protection from protected flag');
        }
        const updated = await index_js_1.featureFlagRepository.update(id, input, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('flag', id, 'update', auditContext, { enabled: existing.enabled, defaultValue: existing.defaultValue }, { enabled: updated.enabled, defaultValue: updated.defaultValue });
        log.info({ key: updated.key, id }, 'Feature flag updated');
        return updated;
    }
    /**
     * Delete a feature flag.
     */
    async deleteFlag(id, auditContext) {
        const existing = await index_js_1.featureFlagRepository.findById(id);
        if (!existing)
            return false;
        if (existing.isGovernanceProtected) {
            throw new Error('Cannot delete governance-protected flag');
        }
        const deleted = await index_js_1.featureFlagRepository.delete(id);
        if (deleted) {
            await index_js_1.auditRepository.log('flag', id, 'delete', auditContext, { key: existing.key }, undefined);
            log.info({ key: existing.key, id }, 'Feature flag deleted');
        }
        return deleted;
    }
    /**
     * Toggle a feature flag.
     */
    async toggleFlag(id, enabled, auditContext) {
        const existing = await index_js_1.featureFlagRepository.findById(id);
        if (!existing)
            return null;
        const updated = await index_js_1.featureFlagRepository.toggle(id, enabled, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('flag', id, enabled ? 'enable' : 'disable', auditContext, { enabled: existing.enabled }, { enabled: updated.enabled });
        log.info({ key: updated.key, id, enabled }, 'Feature flag toggled');
        return updated;
    }
    /**
     * Add a targeting rule to a flag.
     */
    async addTargetingRule(flagId, input, auditContext) {
        const flag = await index_js_1.featureFlagRepository.findById(flagId);
        if (!flag)
            return null;
        // Validate segment exists if specified
        if (input.segmentId) {
            const segment = await index_js_1.segmentRepository.findById(input.segmentId);
            if (!segment) {
                throw new Error(`Segment ${input.segmentId} not found`);
            }
        }
        await index_js_1.featureFlagRepository.addTargetingRule(flagId, input);
        const updated = await index_js_1.featureFlagRepository.findById(flagId);
        await index_js_1.auditRepository.log('flag', flagId, 'update', auditContext, { targetingRulesCount: flag.targetingRules.length }, { targetingRulesCount: updated?.targetingRules.length ?? 0 });
        log.info({ flagId, segmentId: input.segmentId }, 'Targeting rule added');
        return updated;
    }
    /**
     * Remove a targeting rule from a flag.
     */
    async removeTargetingRule(flagId, ruleId, auditContext) {
        const flag = await index_js_1.featureFlagRepository.findById(flagId);
        if (!flag)
            return null;
        await index_js_1.featureFlagRepository.removeTargetingRule(flagId, ruleId);
        const updated = await index_js_1.featureFlagRepository.findById(flagId);
        await index_js_1.auditRepository.log('flag', flagId, 'update', auditContext, { targetingRulesCount: flag.targetingRules.length }, { targetingRulesCount: updated?.targetingRules.length ?? 0 });
        log.info({ flagId, ruleId }, 'Targeting rule removed');
        return updated;
    }
    /**
     * Get a flag by ID.
     */
    async getFlag(id) {
        return index_js_1.featureFlagRepository.findById(id);
    }
    /**
     * Get a flag by key.
     */
    async getFlagByKey(key, tenantId) {
        return index_js_1.featureFlagRepository.findByKey(key, tenantId);
    }
    /**
     * List flags for a tenant.
     */
    async listFlags(tenantId, options) {
        return index_js_1.featureFlagRepository.listByTenant(tenantId, options);
    }
}
exports.FeatureFlagService = FeatureFlagService;
exports.featureFlagService = new FeatureFlagService();
