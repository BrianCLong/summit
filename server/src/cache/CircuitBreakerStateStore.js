"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerStateStore = void 0;
exports.getCircuitBreakerStateStore = getCircuitBreakerStateStore;
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
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
const DEFAULT_CONFIG = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    successThreshold: 3,
    failureWindowMs: 60000,
    stateTTLMs: 3600000, // 1 hour
};
// ============================================================================
// Circuit Breaker State Store
// ============================================================================
class CircuitBreakerStateStore {
    redis;
    keyPrefix;
    configs = new Map();
    localState = new Map();
    syncInterval = null;
    constructor(redis, keyPrefix = 'circuit-breaker:') {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
        // Start periodic sync
        this.syncInterval = setInterval(() => this.syncAllStates(), 5000);
        logger_js_1.default.info('CircuitBreakerStateStore initialized');
    }
    // --------------------------------------------------------------------------
    // Configuration
    // --------------------------------------------------------------------------
    /**
     * Register a circuit breaker with custom configuration
     */
    registerCircuit(name, config = {}) {
        this.configs.set(name, { ...DEFAULT_CONFIG, ...config });
        logger_js_1.default.debug({ name, config }, 'Circuit registered');
    }
    /**
     * Get configuration for a circuit
     */
    getConfig(name) {
        return this.configs.get(name) ?? DEFAULT_CONFIG;
    }
    // --------------------------------------------------------------------------
    // State Management
    // --------------------------------------------------------------------------
    /**
     * Get current state of a circuit
     */
    async getState(name) {
        const key = this.buildKey(name);
        try {
            // Check if state needs transition
            const state = await this.loadState(name);
            const updatedState = this.checkStateTransition(name, state);
            if (updatedState !== state) {
                await this.saveState(name, updatedState);
            }
            return (0, data_envelope_js_1.createDataEnvelope)(updatedState, {
                source: 'CircuitBreakerStateStore',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'State retrieved'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, name }, 'Failed to get circuit state');
            // Return default state on error
            const defaultState = this.createDefaultState(name);
            return (0, data_envelope_js_1.createDataEnvelope)(defaultState, {
                source: 'CircuitBreakerStateStore',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Using default state due to error'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    /**
     * Record a failure for a circuit
     */
    async recordFailure(name) {
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
            logger_js_1.default.warn({ name, failures: state.failures }, 'Circuit opened');
        }
        else if (state.state === 'HALF_OPEN') {
            // Any failure in half-open goes back to open
            state.state = 'OPEN';
            state.openedAt = now;
            state.lastStateChange = now;
            state.successes = 0;
            logger_js_1.default.warn({ name }, 'Circuit re-opened from half-open');
        }
        await this.saveState(name, state);
        return (0, data_envelope_js_1.createDataEnvelope)(state, {
            source: 'CircuitBreakerStateStore',
            governanceVerdict: createVerdict(state.state === 'OPEN' ? data_envelope_js_1.GovernanceResult.DENY : data_envelope_js_1.GovernanceResult.ALLOW, `Failure recorded: ${state.failures}/${config.failureThreshold}`),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Record a success for a circuit
     */
    async recordSuccess(name) {
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
                logger_js_1.default.info({ name }, 'Circuit closed after recovery');
            }
        }
        else if (state.state === 'CLOSED') {
            // Reset failure count on success in closed state
            state.failures = Math.max(0, state.failures - 1);
        }
        await this.saveState(name, state);
        return (0, data_envelope_js_1.createDataEnvelope)(state, {
            source: 'CircuitBreakerStateStore',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Success recorded'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Check if a request should be allowed
     */
    async shouldAllow(name) {
        const stateResult = await this.getState(name);
        const state = stateResult.data;
        const allowed = state.state !== 'OPEN';
        return (0, data_envelope_js_1.createDataEnvelope)(allowed, {
            source: 'CircuitBreakerStateStore',
            governanceVerdict: createVerdict(allowed ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.DENY, `Circuit is ${state.state}`),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Force a circuit to a specific state
     */
    async forceState(name, newState) {
        const state = await this.loadState(name);
        const now = Date.now();
        state.state = newState;
        state.lastStateChange = now;
        if (newState === 'CLOSED') {
            state.failures = 0;
            state.successes = 0;
            state.openedAt = null;
            state.halfOpenAt = null;
        }
        else if (newState === 'OPEN') {
            state.openedAt = now;
            state.halfOpenAt = null;
        }
        else if (newState === 'HALF_OPEN') {
            state.halfOpenAt = now;
            state.successes = 0;
        }
        await this.saveState(name, state);
        logger_js_1.default.info({ name, newState }, 'Circuit state forced');
        return (0, data_envelope_js_1.createDataEnvelope)(state, {
            source: 'CircuitBreakerStateStore',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `State forced to ${newState}`),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Reset a circuit to closed state
     */
    async reset(name) {
        return this.forceState(name, 'CLOSED');
    }
    // --------------------------------------------------------------------------
    // State Transitions
    // --------------------------------------------------------------------------
    checkStateTransition(name, state) {
        const config = this.getConfig(name);
        const now = Date.now();
        if (state.state === 'OPEN' && state.openedAt) {
            // Check if reset timeout has passed
            if (now - state.openedAt >= config.resetTimeoutMs) {
                state.state = 'HALF_OPEN';
                state.halfOpenAt = now;
                state.lastStateChange = now;
                state.successes = 0;
                logger_js_1.default.info({ name }, 'Circuit transitioned to half-open');
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
    async loadState(name) {
        const key = this.buildKey(name);
        try {
            const data = await this.redis.get(key);
            if (data) {
                const state = JSON.parse(data);
                this.localState.set(name, state);
                return state;
            }
        }
        catch (error) {
            logger_js_1.default.error({ error, name }, 'Failed to load circuit state from Redis');
        }
        // Return local state or default
        return this.localState.get(name) ?? this.createDefaultState(name);
    }
    async saveState(name, state) {
        const key = this.buildKey(name);
        const config = this.getConfig(name);
        const ttlSeconds = Math.ceil(config.stateTTLMs / 1000);
        try {
            await this.redis.setex(key, ttlSeconds, JSON.stringify(state));
            this.localState.set(name, state);
        }
        catch (error) {
            logger_js_1.default.error({ error, name }, 'Failed to save circuit state to Redis');
            // Still update local state
            this.localState.set(name, state);
        }
    }
    createDefaultState(name) {
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
    buildKey(name) {
        return `${this.keyPrefix}${name}`;
    }
    // --------------------------------------------------------------------------
    // Sync & Stats
    // --------------------------------------------------------------------------
    async syncAllStates() {
        // Sync all known circuits
        for (const name of this.configs.keys()) {
            try {
                await this.loadState(name);
            }
            catch (error) {
                // Ignore sync errors
            }
        }
    }
    /**
     * Get all circuit breaker states
     */
    async getAllStates() {
        const states = [];
        for (const name of this.configs.keys()) {
            const state = await this.loadState(name);
            states.push(state);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(states, {
            source: 'CircuitBreakerStateStore',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'All states retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get circuit breaker statistics
     */
    async getStats() {
        const states = (await this.getAllStates()).data;
        const stats = {
            totalCircuits: states.length,
            openCircuits: states.filter((s) => s.state === 'OPEN').length,
            halfOpenCircuits: states.filter((s) => s.state === 'HALF_OPEN').length,
            closedCircuits: states.filter((s) => s.state === 'CLOSED').length,
            totalFailures: states.reduce((sum, s) => sum + s.failures, 0),
            totalSuccesses: states.reduce((sum, s) => sum + s.successes, 0),
        };
        return (0, data_envelope_js_1.createDataEnvelope)(stats, {
            source: 'CircuitBreakerStateStore',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Cleanup
    // --------------------------------------------------------------------------
    /**
     * Shutdown the state store
     */
    async shutdown() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        logger_js_1.default.info('CircuitBreakerStateStore shutdown complete');
    }
}
exports.CircuitBreakerStateStore = CircuitBreakerStateStore;
// Export singleton factory
let instance = null;
function getCircuitBreakerStateStore(redis, keyPrefix) {
    if (!instance) {
        instance = new CircuitBreakerStateStore(redis, keyPrefix);
    }
    return instance;
}
exports.default = CircuitBreakerStateStore;
