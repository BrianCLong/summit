/**
 * Redis State Manager
 *
 * Manages session state, provider state, and budget tracking
 * using Redis for persistence and distributed access.
 */

import { EventEmitter } from 'eventemitter3';
import Redis from 'ioredis';
import {
  SessionState,
  ProviderState,
  BudgetState,
  BudgetEntry,
  LLMMessage,
  GovernanceViolation,
  TokenUsage,
  CircuitBreakerState,
  ProviderMetrics,
  LLMProvider,
  LLMModel,
} from '../types/index.js';

export interface RedisStateConfig {
  redisUrl: string;
  keyPrefix: string;
  sessionTTL: number; // seconds
  providerStateTTL: number; // seconds
  budgetResetInterval: 'daily' | 'weekly' | 'monthly';
}

export class RedisStateManager extends EventEmitter {
  private redis: Redis;
  private config: RedisStateConfig;

  constructor(config: Partial<RedisStateConfig> = {}) {
    super();
    this.config = {
      redisUrl: config.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
      keyPrefix: config.keyPrefix ?? 'llm-orchestrator',
      sessionTTL: config.sessionTTL ?? 3600, // 1 hour
      providerStateTTL: config.providerStateTTL ?? 86400, // 24 hours
      budgetResetInterval: config.budgetResetInterval ?? 'daily',
    };

    this.redis = new Redis(this.config.redisUrl, {
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
  async createSession(sessionId: string, userId: string): Promise<SessionState> {
    const now = new Date();
    const session: SessionState = {
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
  async getSession(sessionId: string): Promise<SessionState | null> {
    const key = this.sessionKey(sessionId);
    const data = await this.redis.get(key);

    if (!data) return null;

    const session = JSON.parse(data) as SessionState;
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);
    session.expiresAt = new Date(session.expiresAt);

    return session;
  }

  /**
   * Update session
   */
  async setSession(session: SessionState): Promise<void> {
    const key = this.sessionKey(session.sessionId);
    session.updatedAt = new Date();

    await this.redis.setex(
      key,
      this.config.sessionTTL,
      JSON.stringify(session),
    );
  }

  /**
   * Add message to session
   */
  async addMessage(sessionId: string, message: LLMMessage): Promise<void> {
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
  async updateUsage(sessionId: string, usage: TokenUsage): Promise<void> {
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
  async addGovernanceViolation(
    sessionId: string,
    violation: GovernanceViolation,
  ): Promise<void> {
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
  async deleteSession(sessionId: string): Promise<void> {
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
  async getProviderState(
    provider: LLMProvider,
    model: LLMModel,
  ): Promise<ProviderState | null> {
    const key = this.providerKey(provider, model);
    const data = await this.redis.get(key);

    if (!data) return null;

    const state = JSON.parse(data) as ProviderState;
    state.lastHealthCheck = new Date(state.lastHealthCheck);
    state.metrics.lastReset = new Date(state.metrics.lastReset);

    return state;
  }

  /**
   * Set provider state
   */
  async setProviderState(state: ProviderState): Promise<void> {
    const key = this.providerKey(state.provider, state.model);
    await this.redis.setex(
      key,
      this.config.providerStateTTL,
      JSON.stringify(state),
    );
  }

  /**
   * Update circuit breaker state
   */
  async updateCircuitBreakerState(
    provider: LLMProvider,
    model: LLMModel,
    circuitState: CircuitBreakerState,
  ): Promise<void> {
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
  async updateProviderMetrics(
    provider: LLMProvider,
    model: LLMModel,
    metrics: Partial<ProviderMetrics>,
  ): Promise<void> {
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
  async updateProviderHealth(
    provider: LLMProvider,
    model: LLMModel,
    healthy: boolean,
  ): Promise<void> {
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
  async getBudgetState(userId: string): Promise<BudgetState> {
    const key = this.budgetKey(userId);
    const data = await this.redis.get(key);

    if (!data) {
      return this.createDefaultBudgetState();
    }

    const state = JSON.parse(data) as BudgetState;
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
  async recordBudgetUsage(userId: string, entry: BudgetEntry): Promise<void> {
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
  async checkBudget(
    userId: string,
    estimatedCost: number,
    limits: { daily: number; monthly: number },
  ): Promise<{ allowed: boolean; reason?: string }> {
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

  private sessionKey(sessionId: string): string {
    return `${this.config.keyPrefix}:session:${sessionId}`;
  }

  private providerKey(provider: LLMProvider, model: LLMModel): string {
    return `${this.config.keyPrefix}:provider:${provider}:${model}`;
  }

  private budgetKey(userId: string): string {
    return `${this.config.keyPrefix}:budget:${userId}`;
  }

  private createDefaultProviderState(
    provider: LLMProvider,
    model: LLMModel,
  ): ProviderState {
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

  private createDefaultBudgetState(): BudgetState {
    return {
      dailyUsedUSD: 0,
      monthlyUsedUSD: 0,
      lastReset: new Date(),
      history: [],
    };
  }

  private shouldResetBudget(lastReset: Date): boolean {
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
        return (
          now.getMonth() !== resetDate.getMonth() ||
          now.getFullYear() !== resetDate.getFullYear()
        );
      default:
        return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
