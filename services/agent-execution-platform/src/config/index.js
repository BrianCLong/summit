"use strict";
/**
 * Configuration management for Agent Execution Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.ConfigManager = exports.defaultConfig = void 0;
// Default configuration
exports.defaultConfig = {
    server: {
        port: parseInt(process.env.PORT || '4000', 10),
        host: process.env.HOST || '0.0.0.0',
        cors: {
            enabled: true,
            origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        },
        rateLimit: {
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 100,
        },
    },
    agent: {
        maxConcurrentAgents: parseInt(process.env.MAX_CONCURRENT_AGENTS || '10', 10),
        defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '300000', 10), // 5 minutes
        defaultRetries: parseInt(process.env.DEFAULT_RETRIES || '3', 10),
        resourceLimits: {
            maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB || '1024', 10),
            maxCPUPercent: parseInt(process.env.MAX_CPU_PERCENT || '80', 10),
        },
    },
    pipeline: {
        maxPipelineSteps: parseInt(process.env.MAX_PIPELINE_STEPS || '100', 10),
        defaultStepTimeout: parseInt(process.env.DEFAULT_STEP_TIMEOUT || '60000', 10), // 1 minute
        enableParallelExecution: process.env.ENABLE_PARALLEL === 'true',
        maxParallelSteps: parseInt(process.env.MAX_PARALLEL_STEPS || '5', 10),
    },
    registry: {
        storageBackend: (process.env.REGISTRY_STORAGE || 'postgres'),
        enableVersioning: process.env.ENABLE_VERSIONING !== 'false',
        maxVersionsPerPrompt: parseInt(process.env.MAX_VERSIONS || '10', 10),
        cacheEnabled: process.env.CACHE_ENABLED !== 'false',
        cacheTTL: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
    },
    safety: {
        level: (process.env.SAFETY_LEVEL || 'high'),
        enabledChecks: process.env.ENABLED_CHECKS?.split(',') || [
            'input-validation',
            'output-filtering',
            'pii-detection',
            'rate-limiting',
        ],
        piiDetection: {
            enabled: process.env.PII_DETECTION !== 'false',
            redactInLogs: process.env.PII_REDACT_LOGS !== 'false',
            entities: ['email', 'phone', 'ssn', 'credit_card', 'name'],
        },
        contentModeration: {
            enabled: process.env.CONTENT_MODERATION !== 'false',
            blocklist: [],
            customPatterns: [],
        },
    },
    logging: {
        level: (process.env.LOG_LEVEL || 'info'),
        format: (process.env.LOG_FORMAT || 'json'),
        transports: {
            console: process.env.LOG_CONSOLE !== 'false',
            file: process.env.LOG_FILE === 'true',
            database: process.env.LOG_DATABASE === 'true',
        },
        fileConfig: {
            directory: process.env.LOG_DIR || './logs',
            maxSizeMB: parseInt(process.env.LOG_MAX_SIZE_MB || '100', 10),
            maxFiles: parseInt(process.env.LOG_MAX_FILES || '10', 10),
        },
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'agent_platform',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true',
        poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        keyPrefix: process.env.REDIS_PREFIX || 'agent:',
    },
};
class ConfigManager {
    config;
    constructor(config) {
        this.config = {
            ...exports.defaultConfig,
            ...config,
        };
    }
    get() {
        return this.config;
    }
    update(updates) {
        this.config = {
            ...this.config,
            ...updates,
        };
    }
    validate() {
        // Validate configuration
        if (this.config.server.port < 1 || this.config.server.port > 65535) {
            throw new Error('Invalid server port');
        }
        if (this.config.agent.maxConcurrentAgents < 1) {
            throw new Error('maxConcurrentAgents must be at least 1');
        }
        return true;
    }
}
exports.ConfigManager = ConfigManager;
exports.configManager = new ConfigManager();
