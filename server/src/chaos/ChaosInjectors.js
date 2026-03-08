"use strict";
/**
 * Chaos Injectors
 *
 * Implements various fault injection mechanisms for chaos engineering.
 * Each injector simulates a specific type of failure scenario.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.3 (Incident Response Testing)
 *
 * @module chaos/ChaosInjectors
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosInjectedError = exports.regionKillInjector = exports.exceptionInjector = exports.timeoutInjector = exports.failureInjector = exports.latencyInjector = void 0;
exports.getInjector = getInjector;
exports.registerInjector = registerInjector;
exports.executeInjection = executeInjection;
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const RegionalAvailabilityService_js_1 = require("../services/RegionalAvailabilityService.js");
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'chaos-injector-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'ChaosInjector',
    };
}
function shouldInject(probability) {
    return Math.random() < probability;
}
function matchesTarget(path, targets) {
    return targets.some(pattern => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(path);
    });
}
function generateLatency(config) {
    const { minMs, maxMs, distribution } = config;
    const range = maxMs - minMs;
    switch (distribution) {
        case 'uniform':
            return minMs + Math.random() * range;
        case 'normal': {
            // Box-Muller transform for normal distribution
            let u = 0, v = 0;
            while (u === 0)
                u = Math.random();
            while (v === 0)
                v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            // Scale to our range (mean at midpoint, ~95% within range)
            const mean = (minMs + maxMs) / 2;
            const stdDev = range / 4;
            return Math.max(minMs, Math.min(maxMs, mean + z * stdDev));
        }
        case 'exponential': {
            // Exponential distribution (more short delays, fewer long ones)
            const lambda = 2 / range;
            const delay = -Math.log(1 - Math.random()) / lambda;
            return Math.min(maxMs, minMs + delay);
        }
        default:
            return minMs + Math.random() * range;
    }
}
// ============================================================================
// Injector Implementations
// ============================================================================
/**
 * Latency Injector - Adds artificial delay to requests
 */
exports.latencyInjector = {
    type: 'latency',
    canApply(experiment, context) {
        return matchesTarget(context.path, experiment.targets);
    },
    async inject(experiment, context) {
        const config = experiment.config;
        const delayMs = generateLatency(config);
        logger_js_1.default.debug({
            experimentId: experiment.id,
            requestId: context.requestId,
            delayMs,
            path: context.path,
        }, 'Injecting latency');
        // Actually delay
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return {
            injected: true,
            injectorType: 'latency',
            experimentId: experiment.id,
            experimentName: experiment.name,
            details: {
                delayMs,
                distribution: config.distribution,
            },
            timestamp: new Date().toISOString(),
        };
    },
};
/**
 * Failure Injector - Returns error responses
 */
exports.failureInjector = {
    type: 'failure',
    canApply(experiment, context) {
        return matchesTarget(context.path, experiment.targets);
    },
    async inject(experiment, context) {
        const config = experiment.config;
        logger_js_1.default.debug({
            experimentId: experiment.id,
            requestId: context.requestId,
            statusCode: config.statusCode,
            path: context.path,
        }, 'Injecting failure');
        return {
            injected: true,
            injectorType: 'failure',
            experimentId: experiment.id,
            experimentName: experiment.name,
            details: {
                statusCode: config.statusCode,
                message: config.message,
                errorType: config.errorType,
            },
            timestamp: new Date().toISOString(),
        };
    },
};
/**
 * Timeout Injector - Simulates request timeouts
 */
exports.timeoutInjector = {
    type: 'timeout',
    canApply(experiment, context) {
        return matchesTarget(context.path, experiment.targets);
    },
    async inject(experiment, context) {
        const config = experiment.config;
        const delayMs = generateLatency(config);
        logger_js_1.default.debug({
            experimentId: experiment.id,
            requestId: context.requestId,
            timeoutMs: delayMs,
            path: context.path,
        }, 'Injecting timeout');
        // Delay that will likely trigger client timeout
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return {
            injected: true,
            injectorType: 'timeout',
            experimentId: experiment.id,
            experimentName: experiment.name,
            details: {
                delayMs,
                simulatedTimeout: true,
            },
            timestamp: new Date().toISOString(),
        };
    },
};
/**
 * Exception Injector - Throws runtime exceptions
 */
exports.exceptionInjector = {
    type: 'exception',
    canApply(experiment, context) {
        return matchesTarget(context.path, experiment.targets);
    },
    async inject(experiment, context) {
        const config = experiment.config;
        logger_js_1.default.debug({
            experimentId: experiment.id,
            requestId: context.requestId,
            errorType: config.errorType,
            path: context.path,
        }, 'Injecting exception');
        return {
            injected: true,
            injectorType: 'exception',
            experimentId: experiment.id,
            experimentName: experiment.name,
            details: {
                errorType: config.errorType,
                message: config.message,
                throwException: true,
            },
            timestamp: new Date().toISOString(),
        };
    },
};
/**
 * Region Kill Injector - Simulates a complete regional outage
 */
exports.regionKillInjector = {
    type: 'region_kill',
    canApply(experiment, _context) {
        return true;
    },
    async inject(experiment, _context) {
        const targetRegion = experiment.config.region || 'us-east-1';
        logger_js_1.default.warn({ experimentId: experiment.id, targetRegion }, 'Chaos: Killing region!');
        const availability = RegionalAvailabilityService_js_1.RegionalAvailabilityService.getInstance();
        availability.setRegionStatus(targetRegion, 'DOWN');
        return {
            injected: true,
            injectorType: 'region_kill',
            experimentId: experiment.id,
            experimentName: experiment.name,
            details: {
                killedRegion: targetRegion,
                status: 'DOWN'
            },
            timestamp: new Date().toISOString(),
        };
    },
};
// ============================================================================
// Injector Registry
// ============================================================================
const injectorRegistry = new Map([
    ['latency', exports.latencyInjector],
    ['failure', exports.failureInjector],
    ['timeout', exports.timeoutInjector],
    ['exception', exports.exceptionInjector],
    ['region_kill', exports.regionKillInjector],
]);
/**
 * Get an injector by type
 */
function getInjector(type) {
    return injectorRegistry.get(type);
}
/**
 * Register a custom injector
 */
function registerInjector(injector) {
    injectorRegistry.set(injector.type, injector);
    logger_js_1.default.info({ type: injector.type }, 'Custom chaos injector registered');
}
/**
 * Execute an experiment's injection
 */
async function executeInjection(experiment, context) {
    // Check probability
    if (!shouldInject(experiment.probability)) {
        return (0, data_envelope_js_1.createDataEnvelope)(null, {
            source: 'ChaosInjector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Probability check passed'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // Get injector
    const injector = getInjector(experiment.type);
    if (!injector) {
        logger_js_1.default.warn({ type: experiment.type }, 'No injector found for type');
        return (0, data_envelope_js_1.createDataEnvelope)(null, {
            source: 'ChaosInjector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'No injector available'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // Check if injector can apply
    if (!injector.canApply(experiment, context)) {
        return (0, data_envelope_js_1.createDataEnvelope)(null, {
            source: 'ChaosInjector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Injector not applicable'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // Execute injection
    try {
        const result = await injector.inject(experiment, context);
        logger_js_1.default.info({
            experimentId: experiment.id,
            experimentName: experiment.name,
            injectorType: experiment.type,
            requestId: context.requestId,
            path: context.path,
        }, 'Chaos injected');
        return (0, data_envelope_js_1.createDataEnvelope)(result, {
            source: 'ChaosInjector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, `Chaos injected: ${experiment.type}`),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            error,
            experimentId: experiment.id,
            requestId: context.requestId,
        }, 'Chaos injection failed');
        return (0, data_envelope_js_1.createDataEnvelope)(null, {
            source: 'ChaosInjector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Injection failed'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
}
// ============================================================================
// Custom Chaos Errors
// ============================================================================
/**
 * Error class for chaos-injected failures
 */
class ChaosInjectedError extends Error {
    statusCode;
    experimentId;
    experimentName;
    injectedAt;
    constructor(message, statusCode, experimentId, experimentName) {
        super(message);
        this.name = 'ChaosInjectedError';
        this.statusCode = statusCode;
        this.experimentId = experimentId;
        this.experimentName = experimentName;
        this.injectedAt = new Date();
    }
}
exports.ChaosInjectedError = ChaosInjectedError;
exports.default = {
    getInjector,
    registerInjector,
    executeInjection,
    ChaosInjectedError,
};
