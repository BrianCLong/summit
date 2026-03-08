"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultEdgeConfig = void 0;
exports.mergeEdgeConfig = mergeEdgeConfig;
exports.validateEdgeConfig = validateEdgeConfig;
/**
 * Default edge configuration
 */
exports.defaultEdgeConfig = {
    orchestrator: {
        url: 'http://localhost',
        port: 8080
    },
    node: {
        heartbeatInterval: 30,
        healthCheckInterval: 60,
        metricsInterval: 60,
        syncInterval: 300
    },
    cluster: {
        autoScaling: {
            enabled: false,
            minNodes: 1,
            maxNodes: 10,
            targetCpuUtilization: 70,
            targetMemoryUtilization: 80,
            scaleUpThreshold: 80,
            scaleDownThreshold: 30,
            cooldownPeriod: 300
        },
        loadBalancing: {
            algorithm: 'round-robin',
            healthCheckInterval: 30,
            healthCheckTimeout: 5,
            healthCheckRetries: 3
        }
    },
    sync: {
        maxConcurrent: 5,
        maxRetries: 3,
        retryDelay: 1000,
        compressionEnabled: true,
        encryptionEnabled: true
    },
    security: {
        tlsEnabled: true,
        mtlsEnabled: false,
        tokenExpiry: 3600
    },
    storage: {
        dataPath: '/var/lib/edge/data',
        logsPath: '/var/log/edge',
        modelsPath: '/var/lib/edge/models',
        maxLogSize: 100 * 1024 * 1024, // 100MB
        logRetentionDays: 7
    },
    ai: {
        inferenceTimeout: 5000,
        maxBatchSize: 32,
        modelCacheSizeMB: 1024,
        quantizationEnabled: true,
        accelerator: 'cpu'
    },
    observability: {
        metricsEnabled: true,
        tracingEnabled: true,
        loggingLevel: 'info',
        metricsPort: 9090
    }
};
/**
 * Merge custom config with defaults
 */
function mergeEdgeConfig(custom) {
    return {
        ...exports.defaultEdgeConfig,
        ...custom,
        orchestrator: {
            ...exports.defaultEdgeConfig.orchestrator,
            ...custom.orchestrator
        },
        node: {
            ...exports.defaultEdgeConfig.node,
            ...custom.node
        },
        cluster: {
            autoScaling: {
                ...exports.defaultEdgeConfig.cluster.autoScaling,
                ...custom.cluster?.autoScaling
            },
            loadBalancing: {
                ...exports.defaultEdgeConfig.cluster.loadBalancing,
                ...custom.cluster?.loadBalancing
            }
        },
        sync: {
            ...exports.defaultEdgeConfig.sync,
            ...custom.sync
        },
        security: {
            ...exports.defaultEdgeConfig.security,
            ...custom.security
        },
        storage: {
            ...exports.defaultEdgeConfig.storage,
            ...custom.storage
        },
        ai: {
            ...exports.defaultEdgeConfig.ai,
            ...custom.ai
        },
        observability: {
            ...exports.defaultEdgeConfig.observability,
            ...custom.observability
        }
    };
}
/**
 * Validate edge configuration
 */
function validateEdgeConfig(config) {
    const errors = [];
    if (config.node.heartbeatInterval < 1) {
        errors.push('Heartbeat interval must be at least 1 second');
    }
    if (config.cluster.autoScaling.minNodes < 1) {
        errors.push('Minimum nodes must be at least 1');
    }
    if (config.cluster.autoScaling.maxNodes < config.cluster.autoScaling.minNodes) {
        errors.push('Maximum nodes must be greater than or equal to minimum nodes');
    }
    if (config.sync.maxConcurrent < 1) {
        errors.push('Max concurrent syncs must be at least 1');
    }
    if (config.ai.inferenceTimeout < 100) {
        errors.push('Inference timeout must be at least 100ms');
    }
    if (config.ai.maxBatchSize < 1) {
        errors.push('Max batch size must be at least 1');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
