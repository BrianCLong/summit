"use strict";
/**
 * Bulkhead Middleware
 *
 * Implements the bulkhead pattern for resource isolation.
 * Limits concurrent operations per resource pool to prevent cascade failures.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.2 (Incident Detection)
 *
 * @module middleware/bulkheadMiddleware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiBulkhead = exports.pluginBulkhead = exports.externalApiBulkhead = exports.neo4jBulkhead = exports.databaseBulkhead = exports.BulkheadRejectError = exports.Bulkhead = exports.BULKHEAD_PRESETS = void 0;
exports.createBulkheadMiddleware = createBulkheadMiddleware;
exports.withBulkhead = withBulkhead;
exports.getBulkhead = getBulkhead;
exports.getAllBulkheadStats = getAllBulkheadStats;
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'bulkhead-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'BulkheadMiddleware',
    };
}
// ============================================================================
// Default Configurations
// ============================================================================
exports.BULKHEAD_PRESETS = {
    'database-queries': {
        maxConcurrent: 50,
        queueSize: 100,
        queueTimeoutMs: 5000,
        enableMetrics: true,
    },
    'neo4j-writes': {
        maxConcurrent: 20,
        queueSize: 50,
        queueTimeoutMs: 10000,
        enableMetrics: true,
    },
    'external-api': {
        maxConcurrent: 10,
        queueSize: 20,
        queueTimeoutMs: 30000,
        enableMetrics: true,
    },
    'plugin-execution': {
        maxConcurrent: 5,
        queueSize: 10,
        queueTimeoutMs: 60000,
        enableMetrics: true,
    },
    'ai-inference': {
        maxConcurrent: 3,
        queueSize: 10,
        queueTimeoutMs: 120000,
        enableMetrics: true,
    },
    'report-generation': {
        maxConcurrent: 2,
        queueSize: 5,
        queueTimeoutMs: 300000,
        enableMetrics: true,
    },
    'default': {
        maxConcurrent: 20,
        queueSize: 50,
        queueTimeoutMs: 10000,
        enableMetrics: true,
    },
};
// ============================================================================
// Bulkhead Implementation
// ============================================================================
class Bulkhead {
    name;
    config;
    concurrent = 0;
    queue = [];
    stats;
    constructor(name, config) {
        this.name = name;
        this.config = config;
        this.stats = {
            name,
            concurrent: 0,
            maxConcurrent: config.maxConcurrent,
            queued: 0,
            maxQueued: config.queueSize,
            rejected: 0,
            completed: 0,
            timedOut: 0,
        };
    }
    /**
     * Try to acquire a permit to execute
     */
    async acquire() {
        // Check if we can execute immediately
        if (this.concurrent < this.config.maxConcurrent) {
            this.concurrent++;
            this.stats.concurrent = this.concurrent;
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'Bulkhead',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Permit acquired'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Check if we can queue
        if (this.queue.length >= this.config.queueSize) {
            this.stats.rejected++;
            logger_js_1.default.warn({ bulkhead: this.name, concurrent: this.concurrent, queued: this.queue.length }, 'Bulkhead rejected: queue full');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'Bulkhead',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Queue full'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Add to queue
        return new Promise((resolve) => {
            const requestId = (0, uuid_1.v4)();
            let queuedRequest;
            const timer = setTimeout(() => {
                // Remove from queue on timeout
                const index = this.queue.findIndex(r => r.id === requestId);
                if (index !== -1) {
                    this.queue.splice(index, 1);
                    this.stats.queued = this.queue.length;
                    this.stats.timedOut++;
                    logger_js_1.default.warn({ bulkhead: this.name, requestId, queueTimeoutMs: this.config.queueTimeoutMs }, 'Bulkhead queue timeout');
                    resolve((0, data_envelope_js_1.createDataEnvelope)(false, {
                        source: 'Bulkhead',
                        governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Queue timeout'),
                        classification: data_envelope_js_1.DataClassification.INTERNAL,
                    }));
                }
            }, this.config.queueTimeoutMs);
            queuedRequest = {
                id: requestId,
                resolve: () => {
                    clearTimeout(timer);
                    this.concurrent++;
                    this.stats.concurrent = this.concurrent;
                    resolve((0, data_envelope_js_1.createDataEnvelope)(true, {
                        source: 'Bulkhead',
                        governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Permit acquired from queue'),
                        classification: data_envelope_js_1.DataClassification.INTERNAL,
                    }));
                },
                reject: (error) => {
                    clearTimeout(timer);
                    resolve((0, data_envelope_js_1.createDataEnvelope)(false, {
                        source: 'Bulkhead',
                        governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, error.message),
                        classification: data_envelope_js_1.DataClassification.INTERNAL,
                    }));
                },
                queuedAt: Date.now(),
                timer,
            };
            this.queue.push(queuedRequest);
            this.stats.queued = this.queue.length;
        });
    }
    /**
     * Release a permit after execution completes
     */
    release() {
        this.concurrent--;
        this.stats.concurrent = this.concurrent;
        this.stats.completed++;
        // Process next queued request
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) {
                this.stats.queued = this.queue.length;
                next.resolve();
            }
        }
    }
    /**
     * Get current statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'Bulkhead',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get current availability
     */
    getAvailability() {
        return {
            available: Math.max(0, this.config.maxConcurrent - this.concurrent),
            queued: this.queue.length,
            total: this.config.maxConcurrent,
        };
    }
}
exports.Bulkhead = Bulkhead;
// ============================================================================
// Bulkhead Registry
// ============================================================================
class BulkheadRegistry {
    bulkheads = new Map();
    /**
     * Get or create a bulkhead
     */
    get(name, config) {
        let bulkhead = this.bulkheads.get(name);
        if (!bulkhead) {
            const effectiveConfig = config || exports.BULKHEAD_PRESETS[name] || exports.BULKHEAD_PRESETS.default;
            bulkhead = new Bulkhead(name, effectiveConfig);
            this.bulkheads.set(name, bulkhead);
            logger_js_1.default.info({ name, config: effectiveConfig }, 'Bulkhead created');
        }
        return bulkhead;
    }
    /**
     * Get all bulkhead stats
     */
    getAllStats() {
        const stats = Array.from(this.bulkheads.values()).map(b => b.getStats().data);
        return (0, data_envelope_js_1.createDataEnvelope)(stats, {
            source: 'BulkheadRegistry',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'All stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
}
// Global registry
const registry = new BulkheadRegistry();
// ============================================================================
// Middleware Factory
// ============================================================================
/**
 * Creates bulkhead middleware for a specific resource pool
 */
function createBulkheadMiddleware(poolName, config) {
    const bulkhead = registry.get(poolName, config);
    return async function bulkheadMiddleware(req, res, next) {
        const result = await bulkhead.acquire();
        if (!result.data) {
            const verdict = result.governanceVerdict || createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Bulkhead rejected request');
            logger_js_1.default.warn({
                path: req.path,
                method: req.method,
                pool: poolName,
                tenantId: req.tenantId,
                verdict: verdict.verdictId,
            }, 'Request rejected by bulkhead');
            res.status(503).json({
                error: 'Service Unavailable',
                message: 'System is at capacity, please retry later',
                pool: poolName,
                governanceVerdict: verdict,
            });
            return;
        }
        // Attach release function to response
        res.on('finish', () => {
            bulkhead.release();
        });
        res.on('close', () => {
            // Also release if connection closes unexpectedly
            bulkhead.release();
        });
        next();
    };
}
// ============================================================================
// Decorator for Async Operations
// ============================================================================
/**
 * Wraps an async operation with bulkhead protection
 */
async function withBulkhead(poolName, operation, config) {
    const bulkhead = registry.get(poolName, config);
    const acquired = await bulkhead.acquire();
    if (!acquired.data) {
        throw new BulkheadRejectError(poolName, acquired.governanceVerdict);
    }
    try {
        const result = await operation();
        return (0, data_envelope_js_1.createDataEnvelope)(result, {
            source: 'Bulkhead',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Operation completed'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    finally {
        bulkhead.release();
    }
}
/**
 * Custom error for bulkhead rejection
 */
class BulkheadRejectError extends Error {
    poolName;
    governanceVerdict;
    constructor(poolName, verdict) {
        super(`Bulkhead '${poolName}' rejected request`);
        this.name = 'BulkheadRejectError';
        this.poolName = poolName;
        this.governanceVerdict = verdict;
    }
}
exports.BulkheadRejectError = BulkheadRejectError;
// ============================================================================
// Exports
// ============================================================================
function getBulkhead(name, config) {
    return registry.get(name, config);
}
function getAllBulkheadStats() {
    return registry.getAllStats();
}
// Pre-configured middleware instances
exports.databaseBulkhead = createBulkheadMiddleware('database-queries');
exports.neo4jBulkhead = createBulkheadMiddleware('neo4j-writes');
exports.externalApiBulkhead = createBulkheadMiddleware('external-api');
exports.pluginBulkhead = createBulkheadMiddleware('plugin-execution');
exports.aiBulkhead = createBulkheadMiddleware('ai-inference');
exports.default = createBulkheadMiddleware;
