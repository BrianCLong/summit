"use strict";
// @ts-nocheck
/**
 * V24 Global Coherence Ecosystem - Main Integration Module
 *
 * This module provides a comprehensive intelligence analysis platform that combines
 * signal ingestion, activity fingerprinting, narrative impact modeling, and mission
 * context management into a unified coherence assessment system.
 *
 * Key capabilities:
 * - Real-time signal ingestion with deduplication and provenance tracking
 * - Activity pattern recognition and behavioral fingerprinting
 * - Narrative impact analysis and trend detection
 * - Mission-aware intelligence synthesis
 * - GraphQL API with real-time subscriptions
 * - Comprehensive coherence scoring and risk assessment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCoherenceRoutes = exports.subscriptionResolvers = exports.CoherenceSubscriptionManager = exports.CoherenceService = exports.CoherenceEcosystem = void 0;
exports.createCoherenceEcosystem = createCoherenceEcosystem;
const redis_js_1 = require("../cache/redis.js");
const coherenceService_js_1 = require("./coherenceService.js");
Object.defineProperty(exports, "CoherenceService", { enumerable: true, get: function () { return coherenceService_js_1.CoherenceService; } });
const routes_js_1 = require("./routes.js");
Object.defineProperty(exports, "createCoherenceRoutes", { enumerable: true, get: function () { return routes_js_1.createCoherenceRoutes; } });
const subscriptions_js_1 = require("./graphql/subscriptions.js");
Object.defineProperty(exports, "CoherenceSubscriptionManager", { enumerable: true, get: function () { return subscriptions_js_1.CoherenceSubscriptionManager; } });
const subscriptions_js_2 = require("./graphql/subscriptions.js");
Object.defineProperty(exports, "subscriptionResolvers", { enumerable: true, get: function () { return subscriptions_js_2.subscriptionResolvers; } });
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class CoherenceEcosystem {
    config;
    neo4j;
    redis;
    coherenceService;
    subscriptionManager;
    isInitialized = false;
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize the V24 Global Coherence Ecosystem
     */
    async initialize() {
        if (this.isInitialized) {
            logger_js_1.default.warn('Coherence ecosystem already initialized');
            return;
        }
        try {
            logger_js_1.default.info('Initializing V24 Global Coherence Ecosystem');
            // Initialize database connections
            this.neo4j = new Neo4jService(this.config.neo4j.uri, this.config.neo4j.username, this.config.neo4j.password);
            this.redis = new redis_js_1.RedisService({
                url: this.config.redis.url,
            });
            await this.neo4j.initialize();
            await this.redis.initialize();
            // Initialize core coherence service
            this.coherenceService = new coherenceService_js_1.CoherenceService(this.neo4j, this.redis);
            this.subscriptionManager = this.coherenceService.getSubscriptionManager();
            // Setup database schema
            await this.setupDatabaseSchema();
            // Initialize default configurations
            await this.setupDefaultConfigurations();
            this.isInitialized = true;
            logger_js_1.default.info('V24 Global Coherence Ecosystem initialized successfully', {
                components: [
                    'Neo4j Database',
                    'Redis Cache',
                    'Coherence Service',
                    'Signal Ingestion',
                    'Activity Index',
                    'Narrative Model',
                    'Mission Vault',
                    'GraphQL Subscriptions',
                ],
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize Coherence Ecosystem', { error });
            throw new Error(`Coherence Ecosystem initialization failed: ${error.message}`);
        }
    }
    /**
     * Get the Express router for REST API endpoints
     */
    getRouter() {
        if (!this.isInitialized) {
            throw new Error('Coherence ecosystem not initialized');
        }
        return (0, routes_js_1.createCoherenceRoutes)(this.coherenceService);
    }
    /**
     * Get GraphQL subscription resolvers for real-time updates
     */
    getSubscriptionResolvers() {
        if (!this.isInitialized) {
            throw new Error('Coherence ecosystem not initialized');
        }
        return subscriptions_js_2.subscriptionResolvers;
    }
    /**
     * Get the core coherence service instance
     */
    getCoherenceService() {
        if (!this.isInitialized) {
            throw new Error('Coherence ecosystem not initialized');
        }
        return this.coherenceService;
    }
    /**
     * Get the subscription manager for GraphQL integrations
     */
    getSubscriptionManager() {
        if (!this.isInitialized) {
            throw new Error('Coherence ecosystem not initialized');
        }
        return this.subscriptionManager;
    }
    /**
     * Integrate with Express application
     */
    integrateWithExpress(app, basePath = '/api/v1/coherence') {
        if (!this.isInitialized) {
            throw new Error('Coherence ecosystem not initialized');
        }
        const router = this.getRouter();
        app.use(basePath, router);
        logger_js_1.default.info('Coherence ecosystem integrated with Express', { basePath });
    }
    /**
     * Health check for the entire ecosystem
     */
    async healthCheck() {
        const components = {};
        let overallStatus = 'healthy';
        try {
            // Check Neo4j connectivity
            components.neo4j = {
                status: (await this.neo4j.verifyConnectivity())
                    ? 'healthy'
                    : 'unhealthy',
            };
            // Check Redis connectivity
            const redisPing = await this.redis.ping();
            components.redis = {
                status: redisPing === 'PONG' ? 'healthy' : 'unhealthy',
            };
            // Check coherence service
            if (this.coherenceService) {
                components.coherenceService = { status: 'healthy' };
            }
            else {
                components.coherenceService = { status: 'unhealthy' };
                overallStatus = 'unhealthy';
            }
            // Check subscription manager
            if (this.subscriptionManager) {
                const subscriptionCounts = this.subscriptionManager.getSubscriptionCounts();
                components.subscriptionManager = {
                    status: 'healthy',
                    activeSubscriptions: Object.values(subscriptionCounts).reduce((sum, count) => sum + count, 0),
                };
            }
            else {
                components.subscriptionManager = { status: 'unhealthy' };
                overallStatus = 'degraded';
            }
            // Determine overall status
            if (components.neo4j.status !== 'healthy' ||
                components.redis.status !== 'healthy') {
                overallStatus = 'unhealthy';
            }
            else if (components.subscriptionManager.status !== 'healthy') {
                overallStatus = 'degraded';
            }
        }
        catch (error) {
            logger_js_1.default.error('Health check failed', { error });
            overallStatus = 'unhealthy';
            components.error = { message: error.message };
        }
        return {
            status: overallStatus,
            components,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Gracefully shutdown the ecosystem
     */
    async shutdown() {
        logger_js_1.default.info('Shutting down V24 Global Coherence Ecosystem');
        try {
            // Shutdown coherence service (stops periodic analysis)
            if (this.coherenceService) {
                await this.coherenceService.shutdown();
            }
            // Close database connections
            if (this.neo4j) {
                await this.neo4j.close();
            }
            if (this.redis) {
                await this.redis.close();
            }
            this.isInitialized = false;
            logger_js_1.default.info('V24 Global Coherence Ecosystem shutdown complete');
        }
        catch (error) {
            logger_js_1.default.error('Error during ecosystem shutdown', { error });
            throw error;
        }
    }
    /**
     * Setup database schema and constraints
     */
    async setupDatabaseSchema() {
        const session = this.neo4j.getSession();
        try {
            await session.executeWrite(async (tx) => {
                // Create constraints for unique identifiers
                await tx.run(`
          CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS
          FOR (t:Tenant) REQUIRE t.tenant_id IS UNIQUE
        `);
                await tx.run(`
          CREATE CONSTRAINT signal_id_unique IF NOT EXISTS
          FOR (s:Signal) REQUIRE s.signal_id IS UNIQUE
        `);
                await tx.run(`
          CREATE CONSTRAINT fingerprint_id_unique IF NOT EXISTS
          FOR (af:ActivityFingerprint) REQUIRE af.fingerprint_id IS UNIQUE
        `);
                await tx.run(`
          CREATE CONSTRAINT narrative_id_unique IF NOT EXISTS
          FOR (ni:NarrativeImpact) REQUIRE ni.impact_id IS UNIQUE
        `);
                await tx.run(`
          CREATE CONSTRAINT mission_id_unique IF NOT EXISTS
          FOR (m:Mission) REQUIRE m.mission_id IS UNIQUE
        `);
                // Create indexes for performance
                await tx.run(`
          CREATE INDEX signal_timestamp IF NOT EXISTS
          FOR (s:Signal) ON (s.ts)
        `);
                await tx.run(`
          CREATE INDEX signal_tenant IF NOT EXISTS
          FOR (s:Signal) ON (s.tenant_id)
        `);
                await tx.run(`
          CREATE INDEX fingerprint_confidence IF NOT EXISTS
          FOR (af:ActivityFingerprint) ON (af.confidence)
        `);
                await tx.run(`
          CREATE INDEX narrative_magnitude IF NOT EXISTS
          FOR (ni:NarrativeImpact) ON (ni.magnitude)
        `);
            });
            logger_js_1.default.info('Database schema setup completed');
        }
        finally {
            await session.close();
        }
    }
    /**
     * Setup default configurations in Redis
     */
    async setupDefaultConfigurations() {
        const defaultConfig = {
            analysisInterval: this.config.analysis.defaultInterval || 15,
            signalRetention: this.config.analysis.signalRetention || 365,
            confidenceThreshold: 0.3,
            anomalyThreshold: 2.0,
            enableRealTimeAnalysis: this.config.analysis.enableRealTime !== false,
            enablePredictiveAnalysis: this.config.analysis.enablePredictive !== false,
            notificationSettings: {
                scoreThreshold: 0.8,
                riskThreshold: 0.7,
                enableSlack: !!this.config.notifications?.slack?.webhookUrl,
                enableEmail: !!this.config.notifications?.email?.smtpHost,
            },
        };
        await this.redis.setex('coherence:default:config', 86400, JSON.stringify(defaultConfig));
        logger_js_1.default.info('Default configurations initialized', {
            config: defaultConfig,
        });
    }
}
exports.CoherenceEcosystem = CoherenceEcosystem;
/**
 * Factory function to create a configured Coherence Ecosystem instance
 */
function createCoherenceEcosystem(config) {
    return new CoherenceEcosystem(config);
}
/**
 * Usage Examples:
 *
 * // Basic initialization
 * const ecosystem = createCoherenceEcosystem({
 *   neo4j: { uri: 'bolt://localhost:7687', username: 'neo4j', password: 'password' },
 *   redis: { url: 'redis://localhost:6379' },
 *   analysis: { defaultInterval: 15, signalRetention: 365, enableRealTime: true, enablePredictive: true },
 *   api: { enableRateLimiting: true, enableDebugEndpoints: false },
 *   notifications: {}
 * });
 *
 * await ecosystem.initialize();
 *
 * // Express integration
 * app.use('/api/v1/coherence', ecosystem.getRouter());
 *
 * // GraphQL integration
 * const subscriptionResolvers = ecosystem.getSubscriptionResolvers();
 *
 * // Direct service usage
 * const coherenceService = ecosystem.getCoherenceService();
 * const result = await coherenceService.analyzeCoherence('tenant-123');
 *
 * // Health monitoring
 * const health = await ecosystem.healthCheck();
 * console.log('Ecosystem status:', health.status);
 *
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   await ecosystem.shutdown();
 *   process.exit(0);
 * });
 */
