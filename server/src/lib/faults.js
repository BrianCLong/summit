"use strict";
/**
 * Chaos Engineering: Fault injection system for resilience testing
 * Injectable failures for Neo4j, Redis, and LLM providers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaultScenarios = void 0;
exports.setFaults = setFaults;
exports.setFaultConfig = setFaultConfig;
exports.shouldInjectFault = shouldInjectFault;
exports.flaky = flaky;
exports.injectNeo4jFault = injectNeo4jFault;
exports.injectRedisFault = injectRedisFault;
exports.injectProviderFault = injectProviderFault;
exports.injectNetworkLatency = injectNetworkLatency;
exports.hasResourcePressure = hasResourcePressure;
exports.withFaultInjection = withFaultInjection;
exports.getFaultStats = getFaultStats;
exports.resetFaultStats = resetFaultStats;
exports.createFaultControlMiddleware = createFaultControlMiddleware;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Global fault injection state
 */
let faultFlags = {
    neo4jFailRate: 0,
    redisFailRate: 0,
    providerFailRate: 0,
    rateLimitFailRate: 0,
    compensationFailRate: 0,
    budgetLedgerFailRate: 0,
    networkLatencyMs: 0,
    memoryPressure: false,
    diskPressure: false,
};
let faultConfig = {
    enabled: process.env.CHAOS_ENABLED === 'true',
    globalFailRate: parseFloat(process.env.CHAOS_GLOBAL_FAIL_RATE || '0'),
    faultDurationMs: parseInt(process.env.CHAOS_DURATION_MS || '30000'),
    affectedOperations: (process.env.CHAOS_OPERATIONS || '')
        .split(',')
        .filter(Boolean),
};
let faultStats = {
    totalChecks: 0,
    totalInjections: 0,
    injectionsByType: {},
    lastReset: new Date(),
};
/**
 * Update fault injection flags
 */
function setFaults(updates) {
    faultFlags = { ...faultFlags, ...updates };
    logger_js_1.default.info('Fault injection flags updated', {
        flags: faultFlags,
        enabled: faultConfig.enabled,
    });
}
/**
 * Update fault configuration
 */
function setFaultConfig(updates) {
    faultConfig = { ...faultConfig, ...updates };
    logger_js_1.default.info('Fault injection config updated', {
        config: faultConfig,
    });
}
/**
 * Check if a fault should be injected
 */
function shouldInjectFault(faultType, operationName) {
    if (!faultConfig.enabled) {
        return false;
    }
    faultStats.totalChecks++;
    // Check operation-specific filtering
    if (operationName && faultConfig.affectedOperations.length > 0) {
        if (!faultConfig.affectedOperations.includes(operationName)) {
            return false;
        }
    }
    // Check global fail rate first
    if (faultConfig.globalFailRate > 0 &&
        Math.random() < faultConfig.globalFailRate) {
        return recordInjection(faultType, 'global');
    }
    // Check specific fault rate
    const faultRate = faultFlags[faultType];
    if (typeof faultRate === 'number' && faultRate > 0) {
        if (Math.random() < faultRate) {
            return recordInjection(faultType, 'specific');
        }
    }
    return false;
}
/**
 * Legacy flaky function for backward compatibility
 */
function flaky(faultType, operationName) {
    return shouldInjectFault(faultType, operationName);
}
/**
 * Record fault injection for statistics
 */
function recordInjection(faultType, reason) {
    faultStats.totalInjections++;
    faultStats.injectionsByType[faultType] =
        (faultStats.injectionsByType[faultType] || 0) + 1;
    logger_js_1.default.warn('Fault injected', {
        faultType,
        reason,
        totalInjections: faultStats.totalInjections,
    });
    return true;
}
/**
 * Inject Neo4j faults
 */
function injectNeo4jFault(operation) {
    if (shouldInjectFault('neo4jFailRate', operation)) {
        const errorTypes = [
            'Connection refused',
            'Transaction timeout',
            'Database unavailable',
            'Write conflict',
            'Memory limit exceeded',
        ];
        const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        return new Error(`Injected Neo4j fault: ${randomError} (operation: ${operation})`);
    }
    return null;
}
/**
 * Inject Redis faults
 */
function injectRedisFault(operation) {
    if (shouldInjectFault('redisFailRate', operation)) {
        const errorTypes = [
            'Connection timeout',
            'Redis server went away',
            'Out of memory',
            'Cluster failover in progress',
            'Key evicted',
        ];
        const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        return new Error(`Injected Redis fault: ${randomError} (operation: ${operation})`);
    }
    return null;
}
/**
 * Inject LLM provider faults
 */
function injectProviderFault(provider, operation) {
    if (shouldInjectFault('providerFailRate', `${provider}-${operation}`)) {
        const errorTypes = [
            'Rate limit exceeded',
            'Service temporarily unavailable',
            'Invalid API key',
            'Model overloaded',
            'Context length exceeded',
            'Content policy violation',
        ];
        const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        return new Error(`Injected ${provider} fault: ${randomError} (operation: ${operation})`);
    }
    return null;
}
/**
 * Inject network latency
 */
async function injectNetworkLatency(operation) {
    if (faultFlags.networkLatencyMs > 0) {
        const latency = faultFlags.networkLatencyMs +
            Math.random() * faultFlags.networkLatencyMs * 0.5;
        logger_js_1.default.debug('Injecting network latency', {
            operation,
            latencyMs: Math.round(latency),
        });
        await new Promise((resolve) => setTimeout(resolve, latency));
    }
}
/**
 * Check resource pressure faults
 */
function hasResourcePressure() {
    return {
        memory: faultFlags.memoryPressure,
        disk: faultFlags.diskPressure,
    };
}
/**
 * Generic fault wrapper for async functions
 */
async function withFaultInjection(faultType, operation, fn) {
    // Inject network latency first
    await injectNetworkLatency(operation);
    // Check for specific fault injection
    const fault = getFaultForType(faultType, operation);
    if (fault) {
        throw fault;
    }
    // Execute original function
    return await fn();
}
/**
 * Get fault for specific type
 */
function getFaultForType(faultType, operation) {
    switch (faultType) {
        case 'neo4jFailRate':
            return injectNeo4jFault(operation);
        case 'redisFailRate':
            return injectRedisFault(operation);
        case 'providerFailRate':
            return injectProviderFault('unknown', operation);
        case 'rateLimitFailRate':
            if (shouldInjectFault('rateLimitFailRate', operation)) {
                return new Error(`Injected rate limit fault: Rate limit exceeded (operation: ${operation})`);
            }
            return null;
        case 'compensationFailRate':
            if (shouldInjectFault('compensationFailRate', operation)) {
                return new Error(`Injected compensation fault: Rollback failed (operation: ${operation})`);
            }
            return null;
        case 'budgetLedgerFailRate':
            if (shouldInjectFault('budgetLedgerFailRate', operation)) {
                return new Error(`Injected budget ledger fault: Database write failed (operation: ${operation})`);
            }
            return null;
        default:
            return null;
    }
}
/**
 * Fault injection scenarios for testing
 */
exports.FaultScenarios = {
    /**
     * Total system failure - everything fails
     */
    apocalypse() {
        setFaults({
            neo4jFailRate: 1.0,
            redisFailRate: 1.0,
            providerFailRate: 1.0,
            rateLimitFailRate: 1.0,
            compensationFailRate: 1.0,
            budgetLedgerFailRate: 1.0,
            networkLatencyMs: 5000,
            memoryPressure: true,
            diskPressure: true,
        });
    },
    /**
     * Database instability - Neo4j and Redis intermittent failures
     */
    databaseChaos() {
        setFaults({
            neo4jFailRate: 0.3,
            redisFailRate: 0.2,
            providerFailRate: 0,
            rateLimitFailRate: 0.1,
            compensationFailRate: 0,
            budgetLedgerFailRate: 0.15,
            networkLatencyMs: 1000,
        });
    },
    /**
     * Provider instability - LLM services having issues
     */
    providerChaos() {
        setFaults({
            neo4jFailRate: 0,
            redisFailRate: 0,
            providerFailRate: 0.4,
            rateLimitFailRate: 0.6, // Rate limits often accompany provider issues
            compensationFailRate: 0,
            budgetLedgerFailRate: 0,
            networkLatencyMs: 2000,
        });
    },
    /**
     * Resource pressure - system under load
     */
    resourcePressure() {
        setFaults({
            neo4jFailRate: 0.05,
            redisFailRate: 0.05,
            providerFailRate: 0.1,
            rateLimitFailRate: 0.2,
            compensationFailRate: 0.1,
            budgetLedgerFailRate: 0.05,
            networkLatencyMs: 500,
            memoryPressure: true,
            diskPressure: false,
        });
    },
    /**
     * Network partition - high latency, intermittent failures
     */
    networkPartition() {
        setFaults({
            neo4jFailRate: 0.2,
            redisFailRate: 0.2,
            providerFailRate: 0.3,
            rateLimitFailRate: 0,
            compensationFailRate: 0.1,
            budgetLedgerFailRate: 0.2,
            networkLatencyMs: 10000,
        });
    },
    /**
     * Clear all faults - return to normal operation
     */
    clearAll() {
        setFaults({
            neo4jFailRate: 0,
            redisFailRate: 0,
            providerFailRate: 0,
            rateLimitFailRate: 0,
            compensationFailRate: 0,
            budgetLedgerFailRate: 0,
            networkLatencyMs: 0,
            memoryPressure: false,
            diskPressure: false,
        });
    },
};
/**
 * Get current fault statistics
 */
function getFaultStats() {
    return {
        config: { ...faultConfig },
        flags: { ...faultFlags },
        stats: { ...faultStats },
    };
}
/**
 * Reset fault statistics
 */
function resetFaultStats() {
    faultStats = {
        totalChecks: 0,
        totalInjections: 0,
        injectionsByType: {},
        lastReset: new Date(),
    };
    logger_js_1.default.info('Fault injection statistics reset');
}
/**
 * Express middleware to expose fault controls
 */
function createFaultControlMiddleware() {
    return (req, res, next) => {
        if (req.path === '/chaos/faults' && req.method === 'GET') {
            res.json(getFaultStats());
        }
        else if (req.path === '/chaos/faults' && req.method === 'POST') {
            const { flags, config } = req.body;
            if (flags)
                setFaults(flags);
            if (config)
                setFaultConfig(config);
            res.json({ success: true, stats: getFaultStats() });
        }
        else if (req.path === '/chaos/scenarios' && req.method === 'POST') {
            const { scenario } = req.body;
            if (scenario && exports.FaultScenarios[scenario]) {
                exports.FaultScenarios[scenario]();
                res.json({ success: true, scenario, stats: getFaultStats() });
            }
            else {
                res.status(400).json({
                    error: 'Unknown scenario',
                    availableScenarios: Object.keys(exports.FaultScenarios),
                });
            }
        }
        else {
            next();
        }
    };
}
