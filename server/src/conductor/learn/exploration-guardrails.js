"use strict";
// @ts-nocheck
// server/src/conductor/learn/exploration-guardrails.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplorationGuardrails = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
class ExplorationGuardrails {
    redis;
    configs;
    states;
    constructor() {
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
        this.configs = new Map();
        this.states = new Map();
    }
    async connect() {
        await this.redis.connect();
        await this.loadConfigurations();
    }
    /**
     * Decide whether to explore for a given tenant/expert combination
     */
    async shouldExplore(tenantId, expertType, currentRegret) {
        const configKey = `${tenantId}:${expertType}`;
        const config = this.configs.get(configKey);
        if (!config) {
            // Default safe configuration
            return {
                shouldExplore: Math.random() < 0.01, // 1% default
                explorationRate: 0.01,
                emergencyStop: false,
            };
        }
        const state = await this.getExplorationState(configKey);
        // Check emergency stop conditions
        if (state.isEmergencyStop) {
            const coolingPeriodElapsed = Date.now() - state.lastAdjustment > config.coolingPeriodMs;
            if (!coolingPeriodElapsed) {
                return {
                    shouldExplore: false,
                    explorationRate: 0,
                    adjustmentReason: 'emergency_stop_cooling',
                    emergencyStop: true,
                };
            }
            else {
                // Try to resume with reduced rate
                state.isEmergencyStop = false;
                state.currentRate = Math.max(0.005, config.baseExplorationRate * 0.5);
                await this.saveExplorationState(configKey, state);
            }
        }
        // Get recent regret measurements
        const regretMeasurement = await this.getRegretMeasurement(tenantId, expertType);
        // Check regret-based guardrails
        const regretCheck = await this.checkRegretGuardrails(config, state, regretMeasurement);
        if (regretCheck.emergencyStop) {
            state.isEmergencyStop = true;
            state.lastAdjustment = Date.now();
            await this.saveExplorationState(configKey, state);
            // Alert on-call
            await this.alertOnCall('high_regret', {
                tenantId,
                expertType,
                instantRegret: regretMeasurement.instantRegret,
                threshold: config.regretThreshold,
            });
            return {
                shouldExplore: false,
                explorationRate: 0,
                adjustmentReason: 'regret_emergency_stop',
                emergencyStop: true,
            };
        }
        // Check error rate guardrails
        const errorRate = await this.getErrorRate(tenantId, expertType);
        if (errorRate > config.errorRateThreshold) {
            const reduction = Math.min(0.5, errorRate / config.errorRateThreshold - 1);
            state.currentRate = Math.max(0.005, state.currentRate * (1 - reduction));
            state.lastAdjustment = Date.now();
            await this.saveExplorationState(configKey, state);
            logger_js_1.default.warn('Exploration rate reduced due to error rate', {
                tenantId,
                expertType,
                errorRate,
                newRate: state.currentRate,
                reduction,
            });
        }
        // Adaptive rate adjustment based on exploration success
        if (state.totalExplorationCount >= 100) {
            // Enough data to adapt
            const successRate = state.successfulExplorations / state.totalExplorationCount;
            if (successRate > 0.7 && state.currentRate < config.maxExplorationRate) {
                // Successful explorations - can increase rate
                state.currentRate = Math.min(config.maxExplorationRate, state.currentRate * 1.1);
            }
            else if (successRate < 0.3) {
                // Poor exploration performance - decrease rate
                state.currentRate = Math.max(0.005, state.currentRate * 0.9);
            }
        }
        // Make exploration decision
        const shouldExplore = Math.random() < state.currentRate;
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('exploration_rate', state.currentRate, {
            tenant_id: tenantId,
            expert_type: expertType,
        });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('exploration_decision', shouldExplore, {
            tenant_id: tenantId,
            expert_type: expertType,
        });
        if (regretMeasurement.instantRegret > 0) {
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_instant_regret', regretMeasurement.instantRegret, { tenant_id: tenantId, expert_type: expertType });
        }
        return {
            shouldExplore,
            explorationRate: state.currentRate,
            emergencyStop: false,
        };
    }
    /**
     * Record exploration outcome
     */
    async recordExplorationOutcome(tenantId, expertType, success, regret) {
        const configKey = `${tenantId}:${expertType}`;
        const state = await this.getExplorationState(configKey);
        state.totalExplorationCount++;
        if (success) {
            state.successfulExplorations++;
        }
        await this.saveExplorationState(configKey, state);
        // Store regret measurement
        await this.storeRegretMeasurement(tenantId, expertType, regret);
        logger_js_1.default.debug('Exploration outcome recorded', {
            tenantId,
            expertType,
            success,
            regret,
            totalExplorations: state.totalExplorationCount,
        });
    }
    /**
     * Configure exploration settings for tenant/expert
     */
    async configureExploration(config) {
        const configKey = `${config.tenantId}:${config.expertType}`;
        this.configs.set(configKey, config);
        // Persist to Redis
        await this.redis.hSet('exploration_configs', configKey, JSON.stringify(config));
        logger_js_1.default.info('Exploration configured', {
            tenantId: config.tenantId,
            expertType: config.expertType,
            baseRate: config.baseExplorationRate,
            maxRate: config.maxExplorationRate,
        });
    }
    async loadConfigurations() {
        try {
            const configs = await this.redis.hGetAll('exploration_configs');
            for (const [key, configStr] of Object.entries(configs)) {
                try {
                    const config = JSON.parse(configStr);
                    this.configs.set(key, config);
                }
                catch (error) {
                    logger_js_1.default.warn('Failed to parse exploration config', {
                        key,
                        error: error.message,
                    });
                }
            }
            logger_js_1.default.info(`Loaded ${this.configs.size} exploration configurations`);
        }
        catch (error) {
            logger_js_1.default.error('Failed to load exploration configurations', {
                error: error.message,
            });
        }
    }
    async getExplorationState(configKey) {
        let state = this.states.get(configKey);
        if (!state) {
            // Try to load from Redis
            const stateStr = await this.redis.hGet('exploration_states', configKey);
            if (stateStr) {
                try {
                    state = JSON.parse(stateStr);
                }
                catch (error) {
                    logger_js_1.default.warn('Failed to parse exploration state', { configKey });
                }
            }
            // Default state
            if (!state) {
                const config = this.configs.get(configKey);
                state = {
                    currentRate: config?.baseExplorationRate || 0.01,
                    isEmergencyStop: false,
                    lastAdjustment: 0,
                    consecutiveHighRegret: 0,
                    totalExplorationCount: 0,
                    successfulExplorations: 0,
                };
            }
            this.states.set(configKey, state);
        }
        return state;
    }
    async saveExplorationState(configKey, state) {
        this.states.set(configKey, state);
        await this.redis.hSet('exploration_states', configKey, JSON.stringify(state));
    }
    async getRegretMeasurement(tenantId, expertType) {
        const key = `regret:${tenantId}:${expertType}`;
        // Get recent regret measurements (last 10 minutes)
        const measurements = await this.redis.zRangeByScore(key, Date.now() - 600000, // 10 minutes ago
        Date.now(), { WITHSCORES: true });
        if (measurements.length === 0) {
            return {
                instantRegret: 0,
                cumulativeRegret: 0,
                windowRegret: 0,
                timestamp: Date.now(),
            };
        }
        const values = measurements
            .filter((_, i) => i % 2 === 0)
            .map((v) => parseFloat(v));
        const instantRegret = values[values.length - 1] || 0;
        const cumulativeRegret = values.reduce((sum, val) => sum + val, 0);
        const windowRegret = values.length > 0 ? cumulativeRegret / values.length : 0;
        return {
            instantRegret,
            cumulativeRegret,
            windowRegret,
            timestamp: Date.now(),
        };
    }
    async storeRegretMeasurement(tenantId, expertType, regret) {
        const key = `regret:${tenantId}:${expertType}`;
        const now = Date.now();
        // Store with timestamp
        await this.redis.zAdd(key, { score: now, value: regret.toString() });
        // Keep only last hour of measurements
        await this.redis.zRemRangeByScore(key, '-inf', now - 3600000);
    }
    async checkRegretGuardrails(config, state, regret) {
        if (regret.instantRegret > config.regretThreshold) {
            state.consecutiveHighRegret++;
            // Emergency stop after 3 consecutive high regret measurements
            if (state.consecutiveHighRegret >= 3) {
                return { emergencyStop: true, adjustmentNeeded: false };
            }
            return { emergencyStop: false, adjustmentNeeded: true };
        }
        else {
            state.consecutiveHighRegret = 0;
            return { emergencyStop: false, adjustmentNeeded: false };
        }
    }
    async getErrorRate(tenantId, expertType) {
        const key = `errors:${tenantId}:${expertType}`;
        // Get error count in last 5 minutes
        const errorCount = await this.redis.zCount(key, Date.now() - 300000, Date.now());
        // Get total request count
        const totalKey = `requests:${tenantId}:${expertType}`;
        const totalCount = await this.redis.zCount(totalKey, Date.now() - 300000, Date.now());
        return totalCount > 0 ? errorCount / totalCount : 0;
    }
    async alertOnCall(alertType, context) {
        const alert = {
            type: 'exploration_guardrail_triggered',
            alertType,
            context,
            timestamp: new Date().toISOString(),
            severity: 'warning',
        };
        // Queue alert for on-call system
        await this.redis.lPush('oncall_alerts', JSON.stringify(alert));
        logger_js_1.default.warn('On-call alert triggered', { alertType, context });
    }
    /**
     * Get default exploration configuration
     */
    static getDefaultConfig(tenantId, expertType, tier = 'production') {
        const baseRates = {
            production: 0.02, // 2%
            pilot: 0.05, // 5%
        };
        const maxRates = {
            production: 0.05, // 5%
            pilot: 0.1, // 10%
        };
        return {
            tenantId,
            expertType,
            baseExplorationRate: baseRates[tier],
            maxExplorationRate: maxRates[tier],
            regretThreshold: 0.15, // 15%
            errorRateThreshold: 0.02, // 2%
            coolingPeriodMs: 300000, // 5 minutes
        };
    }
}
exports.ExplorationGuardrails = ExplorationGuardrails;
