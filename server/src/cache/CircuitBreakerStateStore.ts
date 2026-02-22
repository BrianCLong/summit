/**
 * Circuit Breaker State Store
 *
 * Redis-backed shared circuit breaker state for multi-instance deployments.
 * Ensures consistent circuit breaker behavior across all application instances.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.2 (Incident Detection)
 *
 * @module cache/CircuitBreakerStateStore
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.ts';
import logger from '../utils/logger.ts';

// ============================================================================
// Types
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening */
  failureThreshold: number;
  /** Time in ms before attempting recovery */
  resetTimeoutMs: number;
  /** Number of successes in half-open before closing */
  successThreshold: number;
  /** Time window for counting failures in ms */
  failureWindowMs: number;
  /** Time to retain state after last update in ms */
  stateTTLMs: number;
}

export interface CircuitBreakerState {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChange: number;
  openedAt: number | null;
  halfOpenAt: number | null;
}

export interface CircuitBreakerStats {
  totalCircuits: number;
  openCircuits: number;
  halfOpenCircuits: number;
  closedCircuits: number;
  totalFailures: number;
  totalSuccesses: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'circuit-breaker-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'CircuitBreakerStateStore',
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  successThreshold: 3,
  failureWindowMs: 60000,
  stateTTLMs: 3600000, // 1 hour
};

// ============================================================================
// Circuit Breaker State Store
// ============================================================================

export class CircuitBreakerStateStore {
  private redis: Redis;
  private keyPrefix: string;
  private configs: Map<string, CircuitBreakerConfig> = new Map();
  private localState: Map<string, CircuitBreakerState> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(redis: Redis, keyPrefix = 'circuit-breaker:') {
    this.redis = redis;
    this.keyPrefix = keyPrefix;

    // Start periodic sync
    this.syncInterval = setInterval(() => this.syncAllStates(), 5000);

    logger.info('CircuitBreakerStateStore initialized');
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  /**
   * Register a circuit breaker with custom configuration
   */
  registerCircuit(name: string, config: Partial<CircuitBreakerConfig> = {}): void {
    this.configs.set(name, { ...DEFAULT_CONFIG, ...config });
    logger.debug({ name, config }, 'Circuit registered');
  }

  /**
   * Get configuration for a circuit
   */
  getConfig(name: string): CircuitBreakerConfig {
    return this.configs.get(name) ?? DEFAULT_CONFIG;
  }

  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------

  /**
   * Get current state of a circuit
   */
  async getState(name: string): Promise<DataEnvelope<CircuitBreakerState>> {
    const key = this.buildKey(name);

    try {
      // Check if state needs transition
      const state = await this.loadState(name);
      const updatedState = this.checkStateTransition(name, state);

      if (updatedState !== state) {
        await this.saveState(name, updatedState);
      }

      return createDataEnvelope(updatedState, {
        source: 'CircuitBreakerStateStore',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'State retrieved'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      logger.error({ error, name }, 'Failed to get circuit state');

      // Return default state on error
      const defaultState = this.createDefaultState(name);
      return createDataEnvelope(defaultState, {
        source: 'CircuitBreakerStateStore',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Using default state due to error'),
        classification: DataClassification.INTERNAL,
      });
    }
  }

  /**
   * Record a failure for a circuit
   */
  async recordFailure(name: string): Promise<DataEnvelope<CircuitBreakerState>> {
    const config = this.getConfig(name);
    const state = await this.loadState(name);
    const now = Date.now();

    // Update failure count
    state.failures++;
    state.lastFailureTime = now;

    // Check if we need to open the circuit
    if (state.state === 'CLOSED' && state.failures >= config.failureThreshold) {
      state.state = 'OPEN';
      state.openedAt = now;
      state.lastStateChange = now;
      logger.warn({ name, failures: state.failures }, 'Circuit opened');
    } else if (state.state === 'HALF_OPEN') {
      // Any failure in half-open goes back to open
      state.state = 'OPEN';
      state.openedAt = now;
      state.lastStateChange = now;
      state.successes = 0;
      logger.warn({ name }, 'Circuit re-opened from half-open');
    }

    await this.saveState(name, state);

    return createDataEnvelope(state, {
      source: 'CircuitBreakerStateStore',
      governanceVerdict: createVerdict(
        state.state === 'OPEN' ? GovernanceResult.DENY : GovernanceResult.ALLOW,
        `Failure recorded: ${state.failures}/${config.failureThreshold}`
      ),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Record a success for a circuit
   */
  async recordSuccess(name: string): Promise<DataEnvelope<CircuitBreakerState>> {
    const config = this.getConfig(name);
    const state = await this.loadState(name);
    const now = Date.now();

    state.successes++;
    state.lastSuccessTime = now;

    if (state.state === 'HALF_OPEN') {
      if (state.successes >= config.successThreshold) {
        // Enough successes, close the circuit
        state.state = 'CLOSED';
        state.failures = 0;
        state.successes = 0;
        state.lastStateChange = now;
        state.openedAt = null;
        state.halfOpenAt = null;
        logger.info({ name }, 'Circuit closed after recovery');
      }
    } else if (state.state === 'CLOSED') {
      // Reset failure count on success in closed state
      state.failures = Math.max(0, state.failures - 1);
    }

    await this.saveState(name, state);

    return createDataEnvelope(state, {
      source: 'CircuitBreakerStateStore',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Success recorded'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Check if a request should be allowed
   */
  async shouldAllow(name: string): Promise<DataEnvelope<boolean>> {
    const stateResult = await this.getState(name);
    const state = stateResult.data;

    const allowed = state.state !== 'OPEN';

    return createDataEnvelope(allowed, {
      source: 'CircuitBreakerStateStore',
      governanceVerdict: createVerdict(
        allowed ? GovernanceResult.ALLOW : GovernanceResult.DENY,
        `Circuit is ${state.state}`
      ),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Force a circuit to a specific state
   */
  async forceState(name: string, newState: CircuitState): Promise<DataEnvelope<CircuitBreakerState>> {
    const state = await this.loadState(name);
    const now = Date.now();

    state.state = newState;
    state.lastStateChange = now;

    if (newState === 'CLOSED') {
      state.failures = 0;
      state.successes = 0;
      state.openedAt = null;
      state.halfOpenAt = null;
    } else if (newState === 'OPEN') {
      state.openedAt = now;
      state.halfOpenAt = null;
    } else if (newState === 'HALF_OPEN') {
      state.halfOpenAt = now;
      state.successes = 0;
    }

    await this.saveState(name, state);
    logger.info({ name, newState }, 'Circuit state forced');

    return createDataEnvelope(state, {
      source: 'CircuitBreakerStateStore',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `State forced to ${newState}`),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Reset a circuit to closed state
   */
  async reset(name: string): Promise<DataEnvelope<CircuitBreakerState>> {
    return this.forceState(name, 'CLOSED');
  }

  // --------------------------------------------------------------------------
  // State Transitions
  // --------------------------------------------------------------------------

  private checkStateTransition(name: string, state: CircuitBreakerState): CircuitBreakerState {
    const config = this.getConfig(name);
    const now = Date.now();

    if (state.state === 'OPEN' && state.openedAt) {
      // Check if reset timeout has passed
      if (now - state.openedAt >= config.resetTimeoutMs) {
        state.state = 'HALF_OPEN';
        state.halfOpenAt = now;
        state.lastStateChange = now;
        state.successes = 0;
        logger.info({ name }, 'Circuit transitioned to half-open');
      }
    }

    // Clean up old failures outside the window
    if (state.lastFailureTime && now - state.lastFailureTime > config.failureWindowMs) {
      state.failures = 0;
    }

    return state;
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  private async loadState(name: string): Promise<CircuitBreakerState> {
    const key = this.buildKey(name);

    try {
      const data = await this.redis.get(key);
      if (data) {
        const state = JSON.parse(data) as CircuitBreakerState;
        this.localState.set(name, state);
        return state;
      }
    } catch (error: any) {
      logger.error({ error, name }, 'Failed to load circuit state from Redis');
    }

    // Return local state or default
    return this.localState.get(name) ?? this.createDefaultState(name);
  }

  private async saveState(name: string, state: CircuitBreakerState): Promise<void> {
    const key = this.buildKey(name);
    const config = this.getConfig(name);
    const ttlSeconds = Math.ceil(config.stateTTLMs / 1000);

    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(state));
      this.localState.set(name, state);
    } catch (error: any) {
      logger.error({ error, name }, 'Failed to save circuit state to Redis');
      // Still update local state
      this.localState.set(name, state);
    }
  }

  private createDefaultState(name: string): CircuitBreakerState {
    const now = Date.now();
    return {
      name,
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      lastStateChange: now,
      openedAt: null,
      halfOpenAt: null,
    };
  }

  private buildKey(name: string): string {
    return `${this.keyPrefix}${name}`;
  }

  // --------------------------------------------------------------------------
  // Sync & Stats
  // --------------------------------------------------------------------------

  private async syncAllStates(): Promise<void> {
    // Sync all known circuits
    for (const name of this.configs.keys()) {
      try {
        await this.loadState(name);
      } catch (error: any) {
        // Ignore sync errors
      }
    }
  }

  /**
   * Get all circuit breaker states
   */
  async getAllStates(): Promise<DataEnvelope<CircuitBreakerState[]>> {
    const states: CircuitBreakerState[] = [];

    for (const name of this.configs.keys()) {
      const state = await this.loadState(name);
      states.push(state);
    }

    return createDataEnvelope(states, {
      source: 'CircuitBreakerStateStore',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'All states retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get circuit breaker statistics
   */
  async getStats(): Promise<DataEnvelope<CircuitBreakerStats>> {
    const states = (await this.getAllStates()).data;

    const stats: CircuitBreakerStats = {
      totalCircuits: states.length,
      openCircuits: states.filter((s) => s.state === 'OPEN').length,
      halfOpenCircuits: states.filter((s) => s.state === 'HALF_OPEN').length,
      closedCircuits: states.filter((s) => s.state === 'CLOSED').length,
      totalFailures: states.reduce((sum, s) => sum + s.failures, 0),
      totalSuccesses: states.reduce((sum, s) => sum + s.successes, 0),
    };

    return createDataEnvelope(stats, {
      source: 'CircuitBreakerStateStore',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  /**
   * Shutdown the state store
   */
  async shutdown(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    logger.info('CircuitBreakerStateStore shutdown complete');
  }
}

// Export singleton factory
let instance: CircuitBreakerStateStore | null = null;

export function getCircuitBreakerStateStore(redis: Redis, keyPrefix?: string): CircuitBreakerStateStore {
  if (!instance) {
    instance = new CircuitBreakerStateStore(redis, keyPrefix);
  }
  return instance;
}

export default CircuitBreakerStateStore;
