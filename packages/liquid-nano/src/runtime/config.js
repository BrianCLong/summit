import crypto from 'node:crypto';
const DEFAULT_CONFIG = {
    id: crypto.randomUUID(),
    environment: 'dev',
    telemetry: {
        mode: 'console',
        sampleRate: 0.1
    },
    security: {
        allowDynamicPlugins: false,
        redactFields: ['secret', 'token'],
        validateSignatures: true
    },
    performance: {
        maxConcurrency: 4,
        highWatermark: 100,
        adaptiveThrottling: true
    },
    auditTrail: {
        enabled: true,
        sink: 'memory'
    }
};
export function loadConfig(partial = {}) {
    const merged = {
        ...DEFAULT_CONFIG,
        ...partial,
        telemetry: {
            ...DEFAULT_CONFIG.telemetry,
            ...partial.telemetry
        },
        security: {
            ...DEFAULT_CONFIG.security,
            ...partial.security
        },
        performance: {
            ...DEFAULT_CONFIG.performance,
            ...partial.performance
        },
        auditTrail: {
            ...DEFAULT_CONFIG.auditTrail,
            ...partial.auditTrail
        }
    };
    validateConfig(merged);
    return merged;
}
export function validateConfig(config) {
    if (!config.id) {
        throw new Error('runtime config must include an id');
    }
    if (config.performance.maxConcurrency <= 0) {
        throw new Error('maxConcurrency must be greater than zero');
    }
    if (config.performance.highWatermark < config.performance.maxConcurrency) {
        throw new Error('highWatermark must be >= maxConcurrency');
    }
    if (config.telemetry.mode === 'otlp' && !config.telemetry.endpoint) {
        throw new Error('otlp telemetry requires an endpoint');
    }
    if (!['dev', 'staging', 'prod', 'test'].includes(config.environment)) {
        throw new Error(`invalid environment: ${config.environment}`);
    }
}
