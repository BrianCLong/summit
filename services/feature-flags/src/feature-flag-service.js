"use strict";
/**
 * CompanyOS-driven Feature Flags and Access Policies
 * Dynamically toggle Summit features or restrict user capabilities
 * based on organizational policies managed through CompanyOS.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagService = void 0;
const eventemitter3_1 = require("eventemitter3");
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
// Schema definitions
const FeatureFlagTypeSchema = zod_1.z.enum(['boolean', 'percentage', 'variant', 'json']);
const TargetingRuleOperatorSchema = zod_1.z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'in',
    'not_in',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'regex',
    'semver_greater_than',
    'semver_less_than',
]);
const TargetingRuleSchema = zod_1.z.object({
    attribute: zod_1.z.string(),
    operator: TargetingRuleOperatorSchema,
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())]),
});
const TargetingConditionSchema = zod_1.z.object({
    rules: zod_1.z.array(TargetingRuleSchema),
    match: zod_1.z.enum(['all', 'any']).default('all'),
});
const VariantSchema = zod_1.z.object({
    name: zod_1.z.string(),
    weight: zod_1.z.number().min(0).max(100),
    value: zod_1.z.unknown(),
});
const FeatureFlagSchema = zod_1.z.object({
    id: zod_1.z.string(),
    key: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    type: FeatureFlagTypeSchema,
    enabled: zod_1.z.boolean().default(false),
    // Default value when flag is disabled or no rules match
    defaultValue: zod_1.z.unknown(),
    // Targeting rules (evaluated in order)
    targeting: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        conditions: TargetingConditionSchema,
        value: zod_1.z.unknown(),
        percentage: zod_1.z.number().min(0).max(100).optional(),
    })).optional(),
    // Variants for A/B testing
    variants: zod_1.z.array(VariantSchema).optional(),
    // Kill switch - immediately disable regardless of rules
    killSwitch: zod_1.z.boolean().default(false),
    // Schedule
    schedule: zod_1.z.object({
        startDate: zod_1.z.date().optional(),
        endDate: zod_1.z.date().optional(),
        timezone: zod_1.z.string().default('UTC'),
    }).optional(),
    // Metadata
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    owner: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    // CompanyOS integration
    companyOSPolicy: zod_1.z.string().optional(), // OPA policy path
    requiredRoles: zod_1.z.array(zod_1.z.string()).optional(),
    requiredPermissions: zod_1.z.array(zod_1.z.string()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
const EvaluationContextSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    email: zod_1.z.string().optional(),
    roles: zod_1.z.array(zod_1.z.string()).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
    attributes: zod_1.z.record(zod_1.z.unknown()).optional(),
    deviceId: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    timestamp: zod_1.z.date().optional(),
});
class FeatureFlagService extends eventemitter3_1.EventEmitter {
    db;
    redis;
    logger;
    cacheTimeoutMs;
    opaUrl;
    flagCache = new Map();
    constructor(config) {
        super();
        this.db = config.postgres;
        this.redis = config.redis;
        this.logger = config.logger || (0, pino_1.default)({ name: 'feature-flags' });
        this.cacheTimeoutMs = config.cacheTimeoutMs || 60000; // 1 minute default
        this.opaUrl = config.opaUrl || process.env.OPA_URL || 'http://localhost:8181';
    }
    /**
     * Initialize the service
     */
    async initialize() {
        await this.createTables();
        this.logger.info('Feature Flag Service initialized');
    }
    /**
     * Create database tables
     */
    async createTables() {
        await this.db.query(`
      CREATE SCHEMA IF NOT EXISTS feature_flags;

      CREATE TABLE IF NOT EXISTS feature_flags.flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT false,
        default_value JSONB,
        targeting JSONB DEFAULT '[]',
        variants JSONB DEFAULT '[]',
        kill_switch BOOLEAN DEFAULT false,
        schedule JSONB,
        tags TEXT[] DEFAULT '{}',
        owner VARCHAR(255),
        tenant_id VARCHAR(255) NOT NULL,
        companyos_policy VARCHAR(500),
        required_roles TEXT[] DEFAULT '{}',
        required_permissions TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(key, tenant_id)
      );

      CREATE TABLE IF NOT EXISTS feature_flags.evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flag_key VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        enabled BOOLEAN NOT NULL,
        value JSONB,
        variant VARCHAR(255),
        reason VARCHAR(50) NOT NULL,
        rule_index INTEGER,
        evaluation_time_ms FLOAT NOT NULL,
        context JSONB,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS feature_flags.policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tenant_id VARCHAR(255) NOT NULL,
        opa_policy TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(name, tenant_id)
      );

      CREATE INDEX IF NOT EXISTS idx_flags_tenant ON feature_flags.flags(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_flags_key ON feature_flags.flags(key);
      CREATE INDEX IF NOT EXISTS idx_flags_tags ON feature_flags.flags USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_evaluations_flag ON feature_flags.evaluations(flag_key, tenant_id);
      CREATE INDEX IF NOT EXISTS idx_evaluations_user ON feature_flags.evaluations(user_id, tenant_id);
      CREATE INDEX IF NOT EXISTS idx_evaluations_timestamp ON feature_flags.evaluations(timestamp);
    `);
    }
    /**
     * Create a new feature flag
     */
    async createFlag(flag) {
        const fullFlag = {
            ...flag,
            id: (0, crypto_1.randomUUID)(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.db.query(`INSERT INTO feature_flags.flags
       (id, key, name, description, type, enabled, default_value, targeting, variants, kill_switch, schedule, tags, owner, tenant_id, companyos_policy, required_roles, required_permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`, [
            fullFlag.id,
            fullFlag.key,
            fullFlag.name,
            fullFlag.description,
            fullFlag.type,
            fullFlag.enabled,
            JSON.stringify(fullFlag.defaultValue),
            JSON.stringify(fullFlag.targeting || []),
            JSON.stringify(fullFlag.variants || []),
            fullFlag.killSwitch,
            JSON.stringify(fullFlag.schedule),
            fullFlag.tags || [],
            fullFlag.owner,
            fullFlag.tenantId,
            fullFlag.companyOSPolicy,
            fullFlag.requiredRoles || [],
            fullFlag.requiredPermissions || [],
        ]);
        // Invalidate cache
        await this.invalidateCache(fullFlag.key, fullFlag.tenantId);
        this.emit('flag:created', fullFlag);
        this.logger.info({ flagKey: fullFlag.key, tenantId: fullFlag.tenantId }, 'Feature flag created');
        return fullFlag;
    }
    /**
     * Update a feature flag
     */
    async updateFlag(key, tenantId, updates) {
        const existing = await this.getFlag(key, tenantId);
        if (!existing)
            return null;
        const updatedFlag = {
            ...existing,
            ...updates,
            id: existing.id,
            key: existing.key,
            tenantId: existing.tenantId,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
        };
        await this.db.query(`UPDATE feature_flags.flags SET
       name = $1, description = $2, type = $3, enabled = $4, default_value = $5,
       targeting = $6, variants = $7, kill_switch = $8, schedule = $9, tags = $10,
       owner = $11, companyos_policy = $12, required_roles = $13, required_permissions = $14,
       updated_at = NOW()
       WHERE key = $15 AND tenant_id = $16`, [
            updatedFlag.name,
            updatedFlag.description,
            updatedFlag.type,
            updatedFlag.enabled,
            JSON.stringify(updatedFlag.defaultValue),
            JSON.stringify(updatedFlag.targeting || []),
            JSON.stringify(updatedFlag.variants || []),
            updatedFlag.killSwitch,
            JSON.stringify(updatedFlag.schedule),
            updatedFlag.tags || [],
            updatedFlag.owner,
            updatedFlag.companyOSPolicy,
            updatedFlag.requiredRoles || [],
            updatedFlag.requiredPermissions || [],
            key,
            tenantId,
        ]);
        // Invalidate cache
        await this.invalidateCache(key, tenantId);
        this.emit('flag:updated', updatedFlag, updates);
        this.logger.info({ flagKey: key, tenantId }, 'Feature flag updated');
        return updatedFlag;
    }
    /**
     * Delete a feature flag
     */
    async deleteFlag(key, tenantId) {
        const result = await this.db.query(`DELETE FROM feature_flags.flags WHERE key = $1 AND tenant_id = $2`, [key, tenantId]);
        if (result.rowCount && result.rowCount > 0) {
            await this.invalidateCache(key, tenantId);
            this.emit('flag:deleted', key);
            this.logger.info({ flagKey: key, tenantId }, 'Feature flag deleted');
            return true;
        }
        return false;
    }
    /**
     * Get a feature flag
     */
    async getFlag(key, tenantId) {
        // Check local cache
        const cacheKey = `${tenantId}:${key}`;
        const cached = this.flagCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.flag;
        }
        // Check Redis cache
        const redisKey = `feature-flag:${cacheKey}`;
        const redisCached = await this.redis.get(redisKey);
        if (redisCached) {
            const flag = JSON.parse(redisCached);
            this.flagCache.set(cacheKey, { flag, expiresAt: Date.now() + this.cacheTimeoutMs });
            return flag;
        }
        // Query database
        const result = await this.db.query(`SELECT * FROM feature_flags.flags WHERE key = $1 AND tenant_id = $2`, [key, tenantId]);
        if (result.rows.length === 0)
            return null;
        const flag = this.rowToFlag(result.rows[0]);
        // Update caches
        await this.redis.set(redisKey, JSON.stringify(flag), 'PX', this.cacheTimeoutMs);
        this.flagCache.set(cacheKey, { flag, expiresAt: Date.now() + this.cacheTimeoutMs });
        return flag;
    }
    /**
     * List feature flags
     */
    async listFlags(tenantId, options) {
        let query = `SELECT * FROM feature_flags.flags WHERE tenant_id = $1`;
        const params = [tenantId];
        let paramIndex = 2;
        if (options?.tags?.length) {
            query += ` AND tags && $${paramIndex++}`;
            params.push(options.tags);
        }
        if (options?.enabled !== undefined) {
            query += ` AND enabled = $${paramIndex++}`;
            params.push(options.enabled);
        }
        if (options?.search) {
            query += ` AND (key ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${options.search}%`);
            paramIndex++;
        }
        query += ` ORDER BY key`;
        const result = await this.db.query(query, params);
        return result.rows.map((row) => this.rowToFlag(row));
    }
    /**
     * Evaluate a feature flag
     */
    async evaluate(key, context) {
        const startTime = performance.now();
        const flag = await this.getFlag(key, context.tenantId);
        if (!flag) {
            return {
                flagKey: key,
                enabled: false,
                value: null,
                reason: 'disabled',
                evaluationTimeMs: performance.now() - startTime,
            };
        }
        // Check kill switch
        if (flag.killSwitch) {
            const result = this.buildResult(flag, false, flag.defaultValue, 'kill_switch', startTime);
            await this.recordEvaluation(result, context);
            return result;
        }
        // Check if flag is disabled
        if (!flag.enabled) {
            const result = this.buildResult(flag, false, flag.defaultValue, 'disabled', startTime);
            await this.recordEvaluation(result, context);
            return result;
        }
        // Check schedule
        if (flag.schedule) {
            const now = new Date();
            if (flag.schedule.startDate && now < flag.schedule.startDate) {
                const result = this.buildResult(flag, false, flag.defaultValue, 'schedule', startTime);
                await this.recordEvaluation(result, context);
                return result;
            }
            if (flag.schedule.endDate && now > flag.schedule.endDate) {
                const result = this.buildResult(flag, false, flag.defaultValue, 'schedule', startTime);
                await this.recordEvaluation(result, context);
                return result;
            }
        }
        // Check CompanyOS policy
        if (flag.companyOSPolicy) {
            const policyAllowed = await this.checkOPAPolicy(flag.companyOSPolicy, context);
            if (!policyAllowed) {
                const result = this.buildResult(flag, false, flag.defaultValue, 'policy', startTime);
                await this.recordEvaluation(result, context);
                return result;
            }
        }
        // Check required roles
        if (flag.requiredRoles?.length) {
            const hasRole = flag.requiredRoles.some((role) => context.roles?.includes(role));
            if (!hasRole) {
                const result = this.buildResult(flag, false, flag.defaultValue, 'policy', startTime);
                await this.recordEvaluation(result, context);
                return result;
            }
        }
        // Check required permissions
        if (flag.requiredPermissions?.length) {
            const hasPermission = flag.requiredPermissions.every((perm) => {
                if (perm.endsWith(':*')) {
                    const prefix = perm.slice(0, -2);
                    return context.permissions?.some((p) => p.startsWith(prefix));
                }
                return context.permissions?.includes(perm);
            });
            if (!hasPermission) {
                const result = this.buildResult(flag, false, flag.defaultValue, 'policy', startTime);
                await this.recordEvaluation(result, context);
                return result;
            }
        }
        // Evaluate targeting rules
        if (flag.targeting?.length) {
            for (let i = 0; i < flag.targeting.length; i++) {
                const rule = flag.targeting[i];
                if (this.evaluateConditions(rule.conditions, context)) {
                    // Check percentage rollout
                    if (rule.percentage !== undefined && rule.percentage < 100) {
                        const hash = this.hashUserForPercentage(context.userId, key);
                        if (hash > rule.percentage) {
                            continue; // User not in rollout percentage
                        }
                    }
                    const result = this.buildResult(flag, true, rule.value, 'targeting', startTime, i);
                    await this.recordEvaluation(result, context);
                    return result;
                }
            }
        }
        // Handle variants (A/B testing)
        if (flag.variants?.length) {
            const variant = this.selectVariant(flag.variants, context.userId, key);
            const result = this.buildResult(flag, true, variant.value, 'percentage', startTime, undefined, variant.name);
            await this.recordEvaluation(result, context);
            return result;
        }
        // Return default
        const result = this.buildResult(flag, true, flag.defaultValue, 'default', startTime);
        await this.recordEvaluation(result, context);
        return result;
    }
    /**
     * Evaluate multiple flags at once
     */
    async evaluateAll(context) {
        const flags = await this.listFlags(context.tenantId, { enabled: true });
        const results = {};
        await Promise.all(flags.map(async (flag) => {
            results[flag.key] = await this.evaluate(flag.key, context);
        }));
        return results;
    }
    /**
     * Check OPA policy
     */
    async checkOPAPolicy(policyPath, context) {
        try {
            const response = await fetch(`${this.opaUrl}/v1/data/${policyPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: {
                        user: {
                            id: context.userId,
                            email: context.email,
                            roles: context.roles || [],
                            permissions: context.permissions || [],
                            attributes: context.attributes || {},
                        },
                        tenant: context.tenantId,
                        timestamp: (context.timestamp || new Date()).toISOString(),
                    },
                }),
            });
            if (!response.ok) {
                this.logger.warn({ policyPath, status: response.status }, 'OPA policy check failed');
                return true; // Fail open
            }
            const result = await response.json();
            const allowed = result.result?.allow ?? true;
            this.emit('policy:checked', policyPath, allowed);
            return allowed;
        }
        catch (error) {
            this.logger.error({ policyPath, error }, 'OPA policy check error');
            return true; // Fail open
        }
    }
    /**
     * Evaluate targeting conditions
     */
    evaluateConditions(conditions, context) {
        const results = conditions.rules.map((rule) => this.evaluateRule(rule, context));
        if (conditions.match === 'all') {
            return results.every((r) => r);
        }
        return results.some((r) => r);
    }
    /**
     * Evaluate a single targeting rule
     */
    evaluateRule(rule, context) {
        const actualValue = this.getContextValue(context, rule.attribute);
        const expectedValue = rule.value;
        switch (rule.operator) {
            case 'equals':
                return String(actualValue) === String(expectedValue);
            case 'not_equals':
                return String(actualValue) !== String(expectedValue);
            case 'contains':
                return String(actualValue).includes(String(expectedValue));
            case 'not_contains':
                return !String(actualValue).includes(String(expectedValue));
            case 'starts_with':
                return String(actualValue).startsWith(String(expectedValue));
            case 'ends_with':
                return String(actualValue).endsWith(String(expectedValue));
            case 'in':
                return Array.isArray(expectedValue) && expectedValue.includes(String(actualValue));
            case 'not_in':
                return !Array.isArray(expectedValue) || !expectedValue.includes(String(actualValue));
            case 'greater_than':
                return Number(actualValue) > Number(expectedValue);
            case 'less_than':
                return Number(actualValue) < Number(expectedValue);
            case 'greater_than_or_equal':
                return Number(actualValue) >= Number(expectedValue);
            case 'less_than_or_equal':
                return Number(actualValue) <= Number(expectedValue);
            case 'regex':
                try {
                    return new RegExp(String(expectedValue)).test(String(actualValue));
                }
                catch {
                    return false;
                }
            default:
                return false;
        }
    }
    /**
     * Get value from evaluation context
     */
    getContextValue(context, attribute) {
        const parts = attribute.split('.');
        let value = context;
        for (const part of parts) {
            if (value && typeof value === 'object') {
                value = value[part];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    /**
     * Hash user ID for percentage rollout
     */
    hashUserForPercentage(userId, flagKey) {
        let hash = 0;
        const str = `${userId}:${flagKey}`;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash % 100);
    }
    /**
     * Select variant based on user ID
     */
    selectVariant(variants, userId, flagKey) {
        const hash = this.hashUserForPercentage(userId, flagKey);
        let cumulative = 0;
        for (const variant of variants) {
            cumulative += variant.weight;
            if (hash < cumulative) {
                return variant;
            }
        }
        return variants[variants.length - 1];
    }
    /**
     * Build evaluation result
     */
    buildResult(flag, enabled, value, reason, startTime, ruleIndex, variant) {
        return {
            flagKey: flag.key,
            enabled,
            value,
            variant,
            reason,
            ruleIndex,
            evaluationTimeMs: performance.now() - startTime,
        };
    }
    /**
     * Record evaluation for analytics
     */
    async recordEvaluation(result, context) {
        // Fire event
        this.emit('flag:evaluated', result, context);
        // Record to database (async, non-blocking)
        this.db.query(`INSERT INTO feature_flags.evaluations
       (flag_key, tenant_id, user_id, enabled, value, variant, reason, rule_index, evaluation_time_ms, context)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            result.flagKey,
            context.tenantId,
            context.userId,
            result.enabled,
            JSON.stringify(result.value),
            result.variant,
            result.reason,
            result.ruleIndex,
            result.evaluationTimeMs,
            JSON.stringify(context),
        ]).catch((error) => {
            this.logger.error({ error, flagKey: result.flagKey }, 'Failed to record evaluation');
        });
    }
    /**
     * Invalidate cache
     */
    async invalidateCache(key, tenantId) {
        const cacheKey = `${tenantId}:${key}`;
        this.flagCache.delete(cacheKey);
        await this.redis.del(`feature-flag:${cacheKey}`);
    }
    /**
     * Convert database row to flag
     */
    rowToFlag(row) {
        return {
            id: row.id,
            key: row.key,
            name: row.name,
            description: row.description,
            type: row.type,
            enabled: row.enabled,
            defaultValue: row.default_value,
            targeting: row.targeting,
            variants: row.variants,
            killSwitch: row.kill_switch,
            schedule: row.schedule,
            tags: row.tags,
            owner: row.owner,
            tenantId: row.tenant_id,
            companyOSPolicy: row.companyos_policy,
            requiredRoles: row.required_roles,
            requiredPermissions: row.required_permissions,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    /**
     * Get evaluation statistics
     */
    async getStats(tenantId, flagKey, hours = 24) {
        let query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE enabled = true) as enabled_count,
        COUNT(*) FILTER (WHERE enabled = false) as disabled_count,
        AVG(evaluation_time_ms) as avg_time
      FROM feature_flags.evaluations
      WHERE tenant_id = $1 AND timestamp > NOW() - INTERVAL '${hours} hours'
    `;
        const params = [tenantId];
        if (flagKey) {
            query += ` AND flag_key = $2`;
            params.push(flagKey);
        }
        const [statsResult, reasonResult, variantResult] = await Promise.all([
            this.db.query(query, params),
            this.db.query(`SELECT reason, COUNT(*) as count FROM feature_flags.evaluations
         WHERE tenant_id = $1 AND timestamp > NOW() - INTERVAL '${hours} hours'
         ${flagKey ? 'AND flag_key = $2' : ''}
         GROUP BY reason`, params),
            this.db.query(`SELECT variant, COUNT(*) as count FROM feature_flags.evaluations
         WHERE tenant_id = $1 AND timestamp > NOW() - INTERVAL '${hours} hours' AND variant IS NOT NULL
         ${flagKey ? 'AND flag_key = $2' : ''}
         GROUP BY variant`, params),
        ]);
        const stats = statsResult.rows[0];
        return {
            totalEvaluations: Number(stats.total),
            enabledCount: Number(stats.enabled_count),
            disabledCount: Number(stats.disabled_count),
            byReason: Object.fromEntries(reasonResult.rows.map((r) => [r.reason, Number(r.count)])),
            byVariant: Object.fromEntries(variantResult.rows.map((r) => [r.variant, Number(r.count)])),
            avgEvaluationTimeMs: Number(stats.avg_time) || 0,
        };
    }
}
exports.FeatureFlagService = FeatureFlagService;
