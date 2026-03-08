"use strict";
// @ts-nocheck
/**
 * GraphQL Query Cost Calculator
 * Provides pluggable, configurable cost analysis for GraphQL queries
 * with support for hot-reloadable field/type weights
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostCalculator = void 0;
exports.getCostCalculator = getCostCalculator;
exports.createTestCostCalculator = createTestCostCalculator;
const graphql_query_complexity_1 = require("graphql-query-complexity");
const database_js_1 = require("../../config/database.js");
const pino_1 = __importDefault(require("pino"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const logger = pino_1.default();
const __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
/**
 * CostCalculator - Manages GraphQL query cost calculation with configurable weights
 */
class CostCalculator {
    config = null;
    configPath;
    redisConfigKey = 'graphql:cost:config';
    lastConfigLoad = 0;
    configCacheTtlMs = 60000; // 1 minute cache
    constructor(configPath) {
        this.configPath =
            configPath || node_path_1.default.join(__dirname, '../../config/graphql-cost-config.json');
    }
    /**
     * Initialize the cost calculator and load configuration
     */
    async initialize() {
        await this.loadConfig();
        this.setupConfigReload();
    }
    /**
     * Load configuration from Redis (hot config) or fallback to JSON file
     */
    async loadConfig() {
        try {
            // Try Redis first for hot-reloadable config
            const redis = (0, database_js_1.getRedisClient)();
            if (redis) {
                const redisConfig = await redis.get(this.redisConfigKey);
                if (redisConfig) {
                    this.config = JSON.parse(redisConfig);
                    this.lastConfigLoad = Date.now();
                    logger.info('Loaded GraphQL cost config from Redis');
                    return;
                }
            }
        }
        catch (error) {
            logger.warn({ error }, 'Failed to load cost config from Redis, falling back to file');
        }
        // Fallback to file-based config
        try {
            const fileContent = await promises_1.default.readFile(this.configPath, 'utf-8');
            this.config = JSON.parse(fileContent);
            this.lastConfigLoad = Date.now();
            logger.info({ path: this.configPath }, 'Loaded GraphQL cost config from file');
            // Optionally seed Redis with file config
            const redis = (0, database_js_1.getRedisClient)();
            if (redis && this.config) {
                await redis.set(this.redisConfigKey, JSON.stringify(this.config), 'EX', 3600);
            }
        }
        catch (error) {
            logger.error({ error, path: this.configPath }, 'Failed to load cost config from file');
            throw new Error(`Failed to load cost configuration: ${error.message}`);
        }
    }
    /**
     * Setup automatic config reload (check Redis periodically for updates)
     */
    setupConfigReload() {
        // Only setup reload in non-test environments
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        // Check for config updates every minute
        setInterval(async () => {
            const now = Date.now();
            if (now - this.lastConfigLoad > this.configCacheTtlMs) {
                try {
                    await this.loadConfig();
                }
                catch (error) {
                    logger.error({ error }, 'Failed to reload cost config');
                }
            }
        }, this.configCacheTtlMs);
    }
    /**
     * Get current configuration
     */
    getConfig() {
        if (!this.config) {
            throw new Error('Cost calculator not initialized. Call initialize() first.');
        }
        return this.config;
    }
    /**
     * Update configuration in Redis for hot-reload
     */
    async updateConfig(newConfig) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis) {
            throw new Error('Redis not available for config updates');
        }
        await redis.set(this.redisConfigKey, JSON.stringify(newConfig), 'EX', 3600);
        this.config = newConfig;
        this.lastConfigLoad = Date.now();
        logger.info('Updated GraphQL cost config in Redis');
    }
    /**
     * Calculate the cost of a GraphQL query
     */
    calculateCost(schema, document, variables = {}) {
        if (!this.config) {
            throw new Error('Cost calculator not initialized');
        }
        try {
            const complexity = (0, graphql_query_complexity_1.getComplexity)({
                schema,
                query: document,
                variables,
                estimators: [
                    // Custom estimator using our configuration
                    this.createCustomEstimator(),
                    // Field extensions estimator (@complexity directive)
                    (0, graphql_query_complexity_1.fieldExtensionsEstimator)(),
                    // Fallback to simple estimator
                    (0, graphql_query_complexity_1.simpleEstimator)({ defaultComplexity: this.config.defaultCosts.baseField }),
                ],
            });
            return complexity;
        }
        catch (error) {
            logger.error({ error }, 'Failed to calculate query cost');
            // Fail safe: return a high cost to prevent abuse
            return 10000;
        }
    }
    /**
     * Create a custom complexity estimator based on our configuration
     */
    createCustomEstimator() {
        const config = this.config;
        return (args) => {
            const { type, field, args: fieldArgs, childComplexity } = args;
            // Get base cost for this field from config
            const typeName = type.name;
            const fieldName = field.name;
            let baseCost = config.typeCosts[typeName]?.[fieldName] || config.defaultCosts.baseField;
            // Apply list multipliers
            let listMultiplier = 1;
            if (fieldArgs) {
                const limit = fieldArgs.limit || fieldArgs.first || fieldArgs.take;
                if (limit && typeof limit === 'number') {
                    listMultiplier = Math.min(limit, 100); // Cap at 100
                }
            }
            // Apply argument multipliers
            let argMultiplier = 1;
            if (fieldArgs) {
                // Check for depth argument
                if (fieldArgs.depth && typeof fieldArgs.depth === 'number') {
                    const depthMultiplier = config.operationCosts.argumentMultipliers.depth?.[fieldArgs.depth] ||
                        Math.pow(2, fieldArgs.depth - 1);
                    argMultiplier *= depthMultiplier;
                }
                // Check for other expensive arguments
                if (fieldArgs.includeDeleted) {
                    argMultiplier *= config.operationCosts.argumentMultipliers.includeDeleted || 1.5;
                }
                if (fieldArgs.includeArchived) {
                    argMultiplier *= config.operationCosts.argumentMultipliers.includeArchived || 1.3;
                }
                if (fieldArgs.fullText) {
                    argMultiplier *= config.operationCosts.argumentMultipliers.fullText || 2;
                }
            }
            // Calculate total cost
            const totalCost = baseCost * listMultiplier * argMultiplier + childComplexity;
            return totalCost;
        };
    }
    /**
     * Get tenant tier limits
     */
    getTenantLimits(tenantId, tier = 'free') {
        if (!this.config) {
            throw new Error('Cost calculator not initialized');
        }
        // Check for tenant-specific override
        if (this.config.tenantOverrides[tenantId]) {
            return this.config.tenantOverrides[tenantId];
        }
        // Return tier-based limits
        return this.config.tenantTiers[tier] || this.config.tenantTiers.free;
    }
    /**
     * Get user role multiplier
     */
    getUserRoleMultiplier(role) {
        if (!this.config) {
            return 1;
        }
        return this.config.userRoleLimits[role]?.multiplier || 1;
    }
    /**
     * Check if user role is exempt from tenant limits
     */
    isUserExemptFromTenantLimits(role) {
        if (!this.config) {
            return false;
        }
        return this.config.userRoleLimits[role]?.exemptFromTenantLimits || false;
    }
}
exports.CostCalculator = CostCalculator;
// Singleton instance
let costCalculatorInstance = null;
/**
 * Get or create the singleton cost calculator instance
 */
async function getCostCalculator() {
    if (!costCalculatorInstance) {
        costCalculatorInstance = new CostCalculator();
        await costCalculatorInstance.initialize();
    }
    return costCalculatorInstance;
}
/**
 * Initialize cost calculator for testing with custom config
 */
function createTestCostCalculator(config) {
    const calculator = new CostCalculator();
    calculator.config = config;
    return calculator;
}
