"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresProvider = void 0;
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class PostgresProvider extends events_1.EventEmitter {
    name = 'postgres';
    ready = false;
    redis;
    pubsub;
    cache = new Map();
    lastUpdate = 0;
    constructor() {
        super();
    }
    async initialize() {
        try {
            // Connect to Redis for updates if configured
            if (process.env.REDIS_URL) {
                this.redis = new ioredis_1.default(process.env.REDIS_URL);
                this.pubsub = new ioredis_1.default(process.env.REDIS_URL);
                this.pubsub.subscribe('feature_flag_updates', (err) => {
                    if (err) {
                        logger_js_1.default.error('Failed to subscribe to feature_flag_updates', err);
                    }
                });
                this.pubsub.on('message', (channel, message) => {
                    if (channel === 'feature_flag_updates') {
                        this.handleUpdate(message);
                    }
                });
            }
            // Initial load
            await this.refreshCache();
            this.ready = true;
            logger_js_1.default.info('PostgresFeatureFlagProvider initialized');
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize PostgresFeatureFlagProvider', error);
            throw error;
        }
    }
    async close() {
        if (this.redis)
            await this.redis.quit();
        if (this.pubsub)
            await this.pubsub.quit();
        this.ready = false;
    }
    isReady() {
        return this.ready;
    }
    async handleUpdate(message) {
        try {
            // Refresh all for simplicity, or parse message for specific key
            await this.refreshCache();
            this.emit('update');
        }
        catch (error) {
            logger_js_1.default.error('Error handling flag update', error);
        }
    }
    async refreshCache() {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const result = await pool.query('SELECT * FROM feature_flags');
        this.cache.clear();
        for (const row of result.rows) {
            this.cache.set(row.key, this.mapRowToDefinition(row));
        }
        this.lastUpdate = Date.now();
    }
    mapRowToDefinition(row) {
        return {
            key: row.key,
            name: row.key, // fallback
            description: row.description,
            type: row.type,
            enabled: row.enabled,
            defaultValue: row.default_value,
            variations: row.variations || [],
            rules: row.rollout_rules || [], // DB column is rollout_rules, type expects rules
            rollout: undefined, // Simple rollout supported via rules
            metadata: { tenantId: row.tenant_id },
            createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
        };
    }
    async getBooleanFlag(key, defaultValue, context) {
        return this.evaluate(key, defaultValue, context);
    }
    async getStringFlag(key, defaultValue, context) {
        return this.evaluate(key, defaultValue, context);
    }
    async getNumberFlag(key, defaultValue, context) {
        return this.evaluate(key, defaultValue, context);
    }
    async getJSONFlag(key, defaultValue, context) {
        return this.evaluate(key, defaultValue, context);
    }
    async evaluate(key, defaultValue, context) {
        const flag = this.cache.get(key);
        if (!flag) {
            return {
                key,
                value: defaultValue,
                exists: false,
                reason: 'DEFAULT',
                timestamp: Date.now(),
            };
        }
        if (!flag.enabled) {
            return {
                key,
                value: defaultValue, // Or strict fallback? Usually if disabled we return default
                exists: true,
                reason: 'OFF',
                timestamp: Date.now(),
            };
        }
        // Tenant check if applicable
        if (flag.metadata?.tenantId && context.tenantId && flag.metadata.tenantId !== context.tenantId) {
            // Flag is specific to a tenant and context doesn't match
            return {
                key,
                value: defaultValue,
                exists: true,
                reason: 'DEFAULT', // Or custom reason
                timestamp: Date.now(),
            };
        }
        // Evaluate rules
        if (flag.rules && flag.rules.length > 0) {
            for (const rule of flag.rules) {
                if (this.matchesRule(rule, context)) {
                    // Check for percentage rollout within rule
                    if (rule.rollout) {
                        const variationId = this.evaluateRollout(rule.rollout, context, key);
                        if (variationId) {
                            const variation = flag.variations.find(v => v.id === variationId);
                            if (variation) {
                                return {
                                    key,
                                    value: variation.value,
                                    variation: variation.id,
                                    exists: true,
                                    reason: 'RULE_MATCH',
                                    timestamp: Date.now(),
                                };
                            }
                        }
                    }
                    else if (rule.variation) {
                        // Direct variation match
                        const variation = flag.variations.find(v => v.id === rule.variation);
                        if (variation) {
                            return {
                                key,
                                value: variation.value,
                                variation: variation.id,
                                exists: true,
                                reason: 'TARGET_MATCH',
                                timestamp: Date.now(),
                            };
                        }
                    }
                }
            }
        }
        // Return flag default value (from DB column default_value)
        return {
            key,
            value: flag.defaultValue,
            exists: true,
            reason: 'DEFAULT', // Flag default
            timestamp: Date.now(),
        };
    }
    matchesRule(rule, context) {
        return rule.conditions.every(condition => {
            const contextValue = this.getContextValue(context, condition.attribute);
            const match = this.evaluateCondition(condition, contextValue);
            return condition.negate ? !match : match;
        });
    }
    getContextValue(context, attribute) {
        if (attribute === 'userId')
            return context.userId;
        if (attribute === 'email')
            return context.userEmail;
        if (attribute === 'role')
            return context.userRole;
        if (attribute === 'tenantId')
            return context.tenantId;
        return context.attributes?.[attribute];
    }
    evaluateCondition(condition, value) {
        // Simple implementation for now
        if (value === undefined || value === null)
            return false;
        switch (condition.operator) {
            case 'equals': return value === condition.value;
            case 'not_equals': return value !== condition.value;
            case 'contains': return String(value).includes(condition.value);
            case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
            // Add more operators as needed
            default: return false;
        }
    }
    evaluateRollout(rollout, context, flagKey) {
        const bucketBy = rollout.bucketBy || 'userId';
        const bucketValue = this.getContextValue(context, bucketBy);
        if (!bucketValue) {
            return null; // Cannot bucket without value
        }
        const hashInput = `${flagKey}:${String(bucketValue)}:${rollout.seed || 0}`;
        const hash = crypto_1.default.createHash('sha1').update(hashInput).digest('hex');
        const bucket = parseInt(hash.substring(0, 8), 16) % 10000; // 0-9999 (0.00% - 99.99%)
        let accumulated = 0;
        for (const variation of rollout.variations) {
            accumulated += variation.percentage * 100; // Scale to 0-10000
            if (bucket < accumulated) {
                return variation.variation;
            }
        }
        return null; // Should ideally not reach here if percentages sum to 100
    }
    async getAllFlags(context) {
        const result = {};
        for (const key of this.cache.keys()) {
            // Best effort type inference, assuming string for bulk fetch if not known
            result[key] = await this.evaluate(key, null, context);
        }
        return result;
    }
    async getFlagDefinition(key) {
        return this.cache.get(key) || null;
    }
    async listFlags() {
        return Array.from(this.cache.values());
    }
    async track(eventName, context, data) {
        // No-op for now, or log to DB
    }
}
exports.PostgresProvider = PostgresProvider;
