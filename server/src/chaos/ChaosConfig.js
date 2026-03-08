"use strict";
/**
 * Chaos Engineering Configuration
 *
 * Configuration types and defaults for chaos engineering experiments.
 * Defines injection types, probabilities, and safety limits.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.3 (Incident Response Testing)
 *
 * @module chaos/ChaosConfig
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPERIMENT_PRESETS = exports.DEFAULT_NETWORK_CONFIG = exports.DEFAULT_RESOURCE_CONFIG = exports.DEFAULT_FAILURE_CONFIG = exports.DEFAULT_LATENCY_CONFIG = exports.DEFAULT_GLOBAL_CONFIG = void 0;
exports.validateExperiment = validateExperiment;
exports.isEnvironmentAllowed = isEnvironmentAllowed;
exports.isEndpointProtected = isEndpointProtected;
// ============================================================================
// Default Configuration
// ============================================================================
exports.DEFAULT_GLOBAL_CONFIG = {
    enabled: false, // Disabled by default - must be explicitly enabled
    allowedEnvironments: ['development', 'staging', 'chaos'],
    requireTenantOptIn: true,
    maxConcurrentExperiments: 5,
    maxProbability: 0.5, // 50% max
    protectedEndpoints: [
        '/health',
        '/ready',
        '/metrics',
        '/api/v1/auth/*',
        '/api/v1/emergency/*',
    ],
    defaultDurationLimitMs: 300000, // 5 minutes
    auditInjections: true,
    alertThresholdPerMinute: 100,
};
exports.DEFAULT_LATENCY_CONFIG = {
    minMs: 100,
    maxMs: 2000,
    distribution: 'uniform',
};
exports.DEFAULT_FAILURE_CONFIG = {
    statusCode: 500,
    message: 'Chaos injection: Internal Server Error',
    errorType: 'ChaosInjectedError',
};
exports.DEFAULT_RESOURCE_CONFIG = {
    durationMs: 30000,
    intensity: 0.5,
};
exports.DEFAULT_NETWORK_CONFIG = {
    targets: [],
    durationMs: 60000,
    packetLossPercent: 10,
};
// ============================================================================
// Preset Experiments
// ============================================================================
exports.EXPERIMENT_PRESETS = {
    'light-latency': {
        name: 'Light Latency Injection',
        type: 'latency',
        targets: ['/api/*'],
        probability: 0.1,
        config: {
            minMs: 50,
            maxMs: 200,
            distribution: 'uniform',
        },
        enabled: false,
        tenantId: null,
    },
    'heavy-latency': {
        name: 'Heavy Latency Injection',
        type: 'latency',
        targets: ['/api/*'],
        probability: 0.2,
        config: {
            minMs: 500,
            maxMs: 3000,
            distribution: 'exponential',
        },
        enabled: false,
        tenantId: null,
    },
    'random-failure': {
        name: 'Random 500 Errors',
        type: 'failure',
        targets: ['/api/*'],
        probability: 0.05,
        config: {
            statusCode: 500,
            message: 'Chaos: Random server error',
            errorType: 'ChaosError',
        },
        enabled: false,
        tenantId: null,
    },
    'database-timeout': {
        name: 'Database Timeout Simulation',
        type: 'timeout',
        targets: ['/api/v1/entities/*', '/api/v1/relationships/*'],
        probability: 0.1,
        config: {
            minMs: 5000,
            maxMs: 30000,
            distribution: 'uniform',
        },
        enabled: false,
        tenantId: null,
    },
    'service-unavailable': {
        name: 'Service Unavailable',
        type: 'failure',
        targets: ['/api/*'],
        probability: 0.03,
        config: {
            statusCode: 503,
            message: 'Chaos: Service temporarily unavailable',
            errorType: 'ServiceUnavailable',
        },
        enabled: false,
        tenantId: null,
    },
};
// ============================================================================
// Validation Functions
// ============================================================================
function validateExperiment(experiment) {
    const errors = [];
    if (!experiment.id) {
        errors.push('Experiment ID is required');
    }
    if (!experiment.name) {
        errors.push('Experiment name is required');
    }
    if (experiment.probability < 0 || experiment.probability > 1) {
        errors.push('Probability must be between 0 and 1');
    }
    if (experiment.targets.length === 0) {
        errors.push('At least one target is required');
    }
    switch (experiment.type) {
        case 'latency':
        case 'timeout': {
            const config = experiment.config;
            if (config.minMs < 0)
                errors.push('Minimum latency must be non-negative');
            if (config.maxMs < config.minMs)
                errors.push('Maximum latency must be >= minimum');
            break;
        }
        case 'failure': {
            const config = experiment.config;
            if (config.statusCode < 400 || config.statusCode >= 600) {
                errors.push('Status code must be an error code (400-599)');
            }
            break;
        }
        case 'cpu':
        case 'memory':
        case 'disk': {
            const config = experiment.config;
            if (config.intensity < 0 || config.intensity > 1) {
                errors.push('Resource intensity must be between 0 and 1');
            }
            break;
        }
    }
    return errors;
}
function isEnvironmentAllowed(environment, config) {
    return config.allowedEnvironments.includes(environment);
}
function isEndpointProtected(endpoint, config) {
    return config.protectedEndpoints.some(pattern => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(endpoint);
    });
}
exports.default = {
    DEFAULT_GLOBAL_CONFIG: exports.DEFAULT_GLOBAL_CONFIG,
    DEFAULT_LATENCY_CONFIG: exports.DEFAULT_LATENCY_CONFIG,
    DEFAULT_FAILURE_CONFIG: exports.DEFAULT_FAILURE_CONFIG,
    EXPERIMENT_PRESETS: exports.EXPERIMENT_PRESETS,
    validateExperiment,
    isEnvironmentAllowed,
    isEndpointProtected,
};
