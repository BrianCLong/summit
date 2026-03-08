"use strict";
/**
 * Redis State Manager
 *
 * Manages session state, provider state, and budget tracking
 * using Redis for persistence and distributed access.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStateManager = void 0;
const eventemitter3_1 = require("eventemitter3");
const ioredis_1 = __importDefault(require("ioredis"));
class RedisStateManager extends eventemitter3_1.EventEmitter {
    redis;
    config;
    constructor(config = {}) {
        super();
        this.config = {
            redisUrl: config.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
            keyPrefix: config.keyPrefix ?? 'llm-orchestrator',
            sessionTTL: config.sessionTTL ?? 3600, // 1 hour
            providerStateTTL: config.providerStateTTL ?? 86400, // 24 hours
            budgetResetInterval: config.budgetResetInterval ?? 'daily',
        };
        this.redis = new ioredis_1.default(this.config.redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 100, 3000),
        });
        this.redis.on('error', (error) => {
            this.emit('redis:error', error);
        });
        this.redis.on('connect', () => {
            this.emit('redis:connected');
        });
    }
    // ============================================================================
    // Session State Management
    // ============================================================================
    /**
     * Create a new session
     */
    async createSession(sessionId, userId) {
        const now = new Date();
        const session = {
            sessionId,
            userId,
            messages: [],
            context: {},
            usage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                estimatedCostUSD: 0,
            },
            governanceViolations: [],
            createdAt: now,
            updatedAt: now,
            expiresAt: new Date(now.getTime() + this.config.sessionTTL * 1000),
        };
        await this.setSession(session);
        this.emit('session:created', { sessionId, userId });
        return session;
    }
    /**
     * Get session by ID
     */
    async getSession(sessionId) {
        const key = this.sessionKey(sessionId);
        const data = await this.redis.get(key);
        if (!data)
            return null;
        const session = JSON.parse(data);
        session.createdAt = new Date(session.createdAt);
        session.updatedAt = new Date(session.updatedAt);
        session.expiresAt = new Date(session.expiresAt);
        return session;
    }
    /**
     * Update session
     */
    async setSession(session) {
        const key = this.sessionKey(session.sessionId);
        session.updatedAt = new Date();
        await this.redis.setex(key, this.config.sessionTTL, JSON.stringify(session));
    }
    /**
     * Add message to session
     */
    async addMessage(sessionId, message) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.messages.push(message);
        await this.setSession(session);
    }
    /**
     * Update session usage
     */
    async updateUsage(sessionId, usage) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.usage.promptTokens += usage.promptTokens;
        session.usage.completionTokens += usage.completionTokens;
        session.usage.totalTokens += usage.totalTokens;
        session.usage.estimatedCostUSD += usage.estimatedCostUSD;
        await this.setSession(session);
    }
    /**
     * Add governance violation
     */
    async addGovernanceViolation(sessionId, violation) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.governanceViolations.push(violation);
        await this.setSession(session);
    }
    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        const key = this.sessionKey(sessionId);
        await this.redis.del(key);
        this.emit('session:deleted', { sessionId });
    }
    // ============================================================================
    // Provider State Management
    // ============================================================================
    /**
     * Get provider state
     */
    async getProviderState(provider, model) {
        const key = this.providerKey(provider, model);
        const data = await this.redis.get(key);
        if (!data)
            return null;
        const state = JSON.parse(data);
        state.lastHealthCheck = new Date(state.lastHealthCheck);
        state.metrics.lastReset = new Date(state.metrics.lastReset);
        return state;
    }
    /**
     * Set provider state
     */
    async setProviderState(state) {
        const key = this.providerKey(state.provider, state.model);
        await this.redis.setex(key, this.config.providerStateTTL, JSON.stringify(state));
    }
    /**
     * Update circuit breaker state
     */
    async updateCircuitBreakerState(provider, model, circuitState) {
        let state = await this.getProviderState(provider, model);
        if (!state) {
            state = this.createDefaultProviderState(provider, model);
        }
        state.circuitBreaker = circuitState;
        await this.setProviderState(state);
    }
    /**
     * Update provider metrics
     */
    async updateProviderMetrics(provider, model, metrics) {
        let state = await this.getProviderState(provider, model);
        if (!state) {
            state = this.createDefaultProviderState(provider, model);
        }
        state.metrics = { ...state.metrics, ...metrics };
        await this.setProviderState(state);
    }
    /**
     * Update provider health status
     */
    async updateProviderHealth(provider, model, healthy) {
        let state = await this.getProviderState(provider, model);
        if (!state) {
            state = this.createDefaultProviderState(provider, model);
        }
        state.healthy = healthy;
        state.lastHealthCheck = new Date();
        await this.setProviderState(state);
    }
    // ============================================================================
    // Budget Management
    // ============================================================================
    /**
     * Get budget state
     */
    async getBudgetState(userId) {
        const key = this.budgetKey(userId);
        const data = await this.redis.get(key);
        if (!data) {
            return this.createDefaultBudgetState();
        }
        const state = JSON.parse(data);
        state.lastReset = new Date(state.lastReset);
        state.history.forEach((entry) => {
            entry.timestamp = new Date(entry.timestamp);
        });
        // Check if reset is needed
        if (this.shouldResetBudget(state.lastReset)) {
            return this.createDefaultBudgetState();
        }
        return state;
    }
    /**
     * Record budget usage
     */
    async recordBudgetUsage(userId, entry) {
        const state = await this.getBudgetState(userId);
        state.dailyUsedUSD += entry.costUSD;
        state.monthlyUsedUSD += entry.costUSD;
        state.history.push(entry);
        // Keep only last 100 entries
        if (state.history.length > 100) {
            state.history = state.history.slice(-100);
        }
        const key = this.budgetKey(userId);
        await this.redis.setex(key, 86400 * 31, JSON.stringify(state)); // 31 days TTL
        this.emit('budget:recorded', { userId, entry, totalUsed: state.dailyUsedUSD });
    }
    /**
     * Check if budget allows request
     */
    async checkBudget(userId, estimatedCost, limits) {
        const state = await this.getBudgetState(userId);
        if (state.dailyUsedUSD + estimatedCost > limits.daily) {
            return {
                allowed: false,
                reason: `Daily budget exceeded: ${state.dailyUsedUSD.toFixed(4)} + ${estimatedCost.toFixed(4)} > ${limits.daily}`,
            };
        }
        if (state.monthlyUsedUSD + estimatedCost > limits.monthly) {
            return {
                allowed: false,
                reason: `Monthly budget exceeded: ${state.monthlyUsedUSD.toFixed(4)} + ${estimatedCost.toFixed(4)} > ${limits.monthly}`,
            };
        }
        return { allowed: true };
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    sessionKey(sessionId) {
        return `${this.config.keyPrefix}:session:${sessionId}`;
    }
    providerKey(provider, model) {
        return `${this.config.keyPrefix}:provider:${provider}:${model}`;
    }
    budgetKey(userId) {
        return `${this.config.keyPrefix}:budget:${userId}`;
    }
    createDefaultProviderState(provider, model) {
        return {
            provider,
            model,
            circuitBreaker: {
                state: 'closed',
                failures: 0,
                successes: 0,
            },
            metrics: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageLatencyMs: 0,
                p95LatencyMs: 0,
                p99LatencyMs: 0,
                totalTokens: 0,
                totalCostUSD: 0,
                lastReset: new Date(),
            },
            lastHealthCheck: new Date(),
            healthy: true,
        };
    }
    createDefaultBudgetState() {
        return {
            dailyUsedUSD: 0,
            monthlyUsedUSD: 0,
            lastReset: new Date(),
            history: [],
        };
    }
    shouldResetBudget(lastReset) {
        const now = new Date();
        const resetDate = new Date(lastReset);
        switch (this.config.budgetResetInterval) {
            case 'daily':
                return now.toDateString() !== resetDate.toDateString();
            case 'weekly':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return resetDate < weekStart;
            case 'monthly':
                return (now.getMonth() !== resetDate.getMonth() ||
                    now.getFullYear() !== resetDate.getFullYear());
            default:
                return false;
        }
    }
    /**
     * Close Redis connection
     */
    async close() {
        await this.redis.quit();
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        }
        catch {
            return false;
        }
    }
}
exports.RedisStateManager = RedisStateManager;
