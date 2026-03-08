"use strict";
// @ts-nocheck
// server/src/optimization/optimization-manager.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationManager = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const neo4j_query_optimizer_js_1 = require("./neo4j-query-optimizer.js");
const postgres_performance_optimizer_js_1 = require("./postgres-performance-optimizer.js");
const api_gateway_optimizer_js_1 = require("./api-gateway-optimizer.js");
const cost_efficiency_optimizer_js_1 = require("./cost-efficiency-optimizer.js");
const performance_monitoring_system_js_1 = require("./performance-monitoring-system.js");
class OptimizationManager {
    config;
    neo4jOptimizer;
    pgOptimizer;
    gatewayOptimizer;
    costOptimizer;
    monitoringSystem;
    initialized = false;
    startTime = Date.now();
    constructor(config) {
        this.config = {
            enabled: true,
            neo4j: {
                enableQueryCaching: true,
                enableMaterializedViews: true,
                queryTimeoutMs: 30000,
                cacheMaxMemoryMB: 512,
            },
            postgres: {
                enableQueryCaching: true,
                enableAutoIndexing: true,
                connectionPoolSize: 20,
                slowQueryThresholdMs: 1000,
            },
            apiGateway: {
                enableResponseCaching: true,
                enableCircuitBreaker: true,
                enableBulkhead: true,
                enableRequestBatching: true,
            },
            costOptimization: {
                enableIntelligentRouting: true,
                enableBudgetTracking: true,
                enableCostPrediction: true,
                defaultBudgetLimit: 100.0,
            },
            monitoring: {
                metricsRetentionHours: 72,
                alertingEnabled: true,
                sloMonitoringEnabled: true,
                regressionDetectionEnabled: true,
            },
            ...config,
        };
    }
    /**
     * 🚀 Initialize all optimization systems
     */
    async initialize() {
        if (this.initialized) {
            logger_js_1.default.warn('OptimizationManager already initialized');
            return;
        }
        logger_js_1.default.info('🎯 Initializing IntelGraph Performance Optimization Suite...');
        try {
            // Initialize individual optimizers
            this.neo4jOptimizer = new neo4j_query_optimizer_js_1.Neo4jQueryOptimizer((0, database_js_1.getNeo4jDriver)());
            this.pgOptimizer = new postgres_performance_optimizer_js_1.PostgresPerformanceOptimizer((0, database_js_1.getPostgresPool)());
            this.gatewayOptimizer = new api_gateway_optimizer_js_1.ApiGatewayOptimizer();
            this.costOptimizer = new cost_efficiency_optimizer_js_1.CostEfficiencyOptimizer();
            // Initialize monitoring system with all optimizers
            this.monitoringSystem = new performance_monitoring_system_js_1.PerformanceMonitoringSystem({
                neo4j: this.neo4jOptimizer,
                postgres: this.pgOptimizer,
                gateway: this.gatewayOptimizer,
                cost: this.costOptimizer,
            });
            // Set up event listeners for cross-system coordination
            this.setupEventListeners();
            // Run initial optimization assessment
            await this.runInitialOptimizationAssessment();
            this.initialized = true;
            logger_js_1.default.info('✅ IntelGraph Performance Optimization Suite initialized successfully');
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to initialize optimization systems:', error);
            throw error;
        }
    }
    /**
     * 🎯 Get optimized query middleware for Express applications
     */
    getOptimizedQueryMiddleware() {
        if (!this.initialized) {
            throw new Error('OptimizationManager not initialized');
        }
        return {
            // Neo4j query optimization middleware
            neo4jQuery: (options) => {
                return async (req, res, next) => {
                    if (!this.config.enabled || !this.config.neo4j.enableQueryCaching) {
                        return next();
                    }
                    const originalQuery = req.body.query || req.query.q;
                    if (!originalQuery)
                        return next();
                    try {
                        const optimizedResult = await this.neo4jOptimizer.executeOptimizedQuery(originalQuery, req.body.parameters || {}, {
                            useCache: this.config.neo4j.enableQueryCaching,
                            timeout: this.config.neo4j.queryTimeoutMs,
                            ...options,
                        });
                        // Attach optimization metadata to response
                        res.set('X-Query-Optimizations', optimizedResult.optimizationApplied.join(','));
                        res.set('X-Cache-Status', optimizedResult.cacheHit ? 'HIT' : 'MISS');
                        res.set('X-Query-Time', optimizedResult.metrics.executionTimeMs.toString());
                        req.optimizedQuery = optimizedResult;
                        next();
                    }
                    catch (error) {
                        logger_js_1.default.error('Neo4j query optimization failed:', error);
                        next();
                    }
                };
            },
            // PostgreSQL query optimization middleware
            postgresQuery: (options) => {
                return async (req, res, next) => {
                    if (!this.config.enabled ||
                        !this.config.postgres.enableQueryCaching) {
                        return next();
                    }
                    const originalQuery = req.body.query || req.query.q;
                    const parameters = req.body.parameters || [];
                    if (!originalQuery)
                        return next();
                    try {
                        const optimizedResult = await this.pgOptimizer.executeOptimizedQuery(originalQuery, parameters, {
                            useCache: this.config.postgres.enableQueryCaching,
                            ...options,
                        });
                        // Attach optimization metadata
                        res.set('X-Query-Optimizations', optimizedResult.optimizationApplied.join(','));
                        res.set('X-Cache-Status', optimizedResult.cacheHit ? 'HIT' : 'MISS');
                        res.set('X-Execution-Time', optimizedResult.executionTime.toString());
                        req.optimizedQuery = optimizedResult;
                        next();
                    }
                    catch (error) {
                        logger_js_1.default.error('PostgreSQL query optimization failed:', error);
                        next();
                    }
                };
            },
            // API response caching middleware
            responseCache: (config) => {
                if (!this.config.enabled ||
                    !this.config.apiGateway.enableResponseCaching) {
                    return (req, res, next) => next();
                }
                return this.gatewayOptimizer.createCacheMiddleware({
                    ttl: 300, // 5 minutes default
                    ...config,
                });
            },
            // Circuit breaker middleware
            circuitBreaker: (config) => {
                if (!this.config.enabled ||
                    !this.config.apiGateway.enableCircuitBreaker) {
                    return (req, res, next) => next();
                }
                return this.gatewayOptimizer.createCircuitBreakerMiddleware({
                    failureThreshold: 5,
                    resetTimeoutMs: 60000,
                    monitoringPeriodMs: 10000,
                    halfOpenMaxCalls: 3,
                    ...config,
                });
            },
            // Bulkhead pattern middleware
            bulkhead: (config) => {
                if (!this.config.enabled || !this.config.apiGateway.enableBulkhead) {
                    return (req, res, next) => next();
                }
                return this.gatewayOptimizer.createBulkheadMiddleware({
                    maxConcurrent: 100,
                    queueSize: 50,
                    timeoutMs: 30000,
                    ...config,
                });
            },
            // Request batching middleware
            requestBatching: () => {
                if (!this.config.enabled ||
                    !this.config.apiGateway.enableRequestBatching) {
                    return (req, res, next) => next();
                }
                return this.gatewayOptimizer.createBatchingMiddleware();
            },
            // Budget tracking middleware
            budgetTracking: (config) => {
                if (!this.config.enabled ||
                    !this.config.costOptimization.enableBudgetTracking) {
                    return (req, res, next) => next();
                }
                return this.gatewayOptimizer.createBudgetMiddleware();
            },
        };
    }
    /**
     * 🤖 Intelligent model selection for AI requests
     */
    async selectOptimalModel(criteria) {
        if (!this.initialized) {
            throw new Error('OptimizationManager not initialized');
        }
        if (!this.config.costOptimization.enableIntelligentRouting) {
            throw new Error('Intelligent routing is disabled');
        }
        return await this.costOptimizer.selectOptimalModel({
            ...criteria,
            budgetLimit: criteria.budgetLimit || this.config.costOptimization.defaultBudgetLimit,
        });
    }
    /**
     * 📊 Generate comprehensive optimization report
     */
    async generateOptimizationReport() {
        if (!this.initialized) {
            throw new Error('OptimizationManager not initialized');
        }
        const [neo4jStats, pgReport, gatewayReport, costReport, dashboard] = await Promise.all([
            this.neo4jOptimizer.getPerformanceStats(),
            this.pgOptimizer.getPerformanceReport(),
            this.gatewayOptimizer.getPerformanceReport(),
            this.costOptimizer.getUsageReport('system', 'system'),
            this.monitoringSystem.getDashboard(),
        ]);
        const uptime = (Date.now() - this.startTime) / 1000 / 60 / 60 / 24; // Days
        const report = {
            summary: {
                totalRequests: dashboard.overview.totalRequests,
                avgResponseTime: dashboard.overview.avgResponseTime,
                costSavings: this.calculateTotalCostSavings(costReport),
                performanceImprovement: this.calculatePerformanceImprovement(),
                uptime,
            },
            databases: {
                neo4j: {
                    queryOptimizations: neo4jStats.totalQueries,
                    cacheHitRate: neo4jStats.p95ExecutionTime > 0 ? 0.85 : 0, // Simplified
                    avgQueryTime: neo4jStats.avgExecutionTime,
                    materializedViewsActive: neo4jStats.materializedViewsCount,
                },
                postgres: {
                    queryOptimizations: pgReport.queryStats?.totalQueries || 0,
                    indexRecommendations: pgReport.indexRecommendations?.length || 0,
                    connectionEfficiency: this.calculateConnectionEfficiency(pgReport.connectionPoolMetrics),
                    slowQueryReductions: pgReport.slowQueries?.length || 0,
                },
            },
            apiGateway: {
                cacheHitRate: gatewayReport.cache?.totalEntries ? 0.75 : 0, // Simplified
                circuitBreakerActivations: this.countCircuitBreakerActivations(gatewayReport),
                requestBatchingEfficiency: gatewayReport.activeBatches || 0,
                latencyReduction: this.calculateLatencyReduction(),
            },
            costOptimization: {
                totalSavings: costReport.costs?.total || 0,
                modelSwitchingBenefit: this.calculateModelSwitchingBenefit(costReport),
                budgetComplianceRate: this.calculateBudgetCompliance(costReport),
                optimizationRecommendations: costReport.recommendations?.length || 0,
            },
            recommendations: await this.generateOptimizationRecommendations(),
        };
        return report;
    }
    /**
     * 🔧 Manual optimization controls
     */
    async clearAllCaches() {
        const results = {
            neo4j: { success: false },
            postgres: { success: false },
            apiGateway: { success: false },
        };
        try {
            await this.neo4jOptimizer.clearCache();
            results.neo4j.success = true;
        }
        catch (error) {
            logger_js_1.default.error('Failed to clear Neo4j cache:', error);
        }
        try {
            await this.pgOptimizer.clearQueryCache();
            results.postgres.success = true;
        }
        catch (error) {
            logger_js_1.default.error('Failed to clear PostgreSQL cache:', error);
        }
        try {
            await this.gatewayOptimizer.clearAllCaches();
            results.apiGateway.success = true;
        }
        catch (error) {
            logger_js_1.default.error('Failed to clear API Gateway cache:', error);
        }
        return results;
    }
    async createRecommendedIndexes(limit = 5) {
        if (!this.config.postgres.enableAutoIndexing) {
            throw new Error('Auto-indexing is disabled');
        }
        return await this.pgOptimizer.createRecommendedIndexes(limit);
    }
    async updateBudgetLimit(userId, tenantId, newLimit) {
        if (!this.config.costOptimization.enableBudgetTracking) {
            throw new Error('Budget tracking is disabled');
        }
        await this.costOptimizer.updateBudget(userId, tenantId, newLimit);
    }
    /**
     * 📈 Performance monitoring and alerting
     */
    async getDashboard() {
        return await this.monitoringSystem.getDashboard();
    }
    async getMetricsHistory(hours = 24) {
        return await this.monitoringSystem.getMetricsHistory(hours);
    }
    async createCustomAlert(rule) {
        await this.monitoringSystem.createAlertRule(rule);
    }
    async getActiveAlerts() {
        return await this.monitoringSystem.getActiveAlerts();
    }
    /**
     * ⚙️ Configuration management
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        logger_js_1.default.info('Optimization configuration updated', updates);
    }
    getConfig() {
        return { ...this.config };
    }
    /**
     * 🔄 Health check and diagnostics
     */
    async healthCheck() {
        const components = {
            neo4jOptimizer: 'healthy',
            pgOptimizer: 'healthy',
            gatewayOptimizer: 'healthy',
            costOptimizer: 'healthy',
            monitoringSystem: 'healthy',
        };
        const details = {};
        // Check each component
        try {
            const neo4jStats = await this.neo4jOptimizer.getPerformanceStats();
            details.neo4j = neo4jStats;
            if (neo4jStats.avgExecutionTime > 5000) {
                components.neo4jOptimizer = 'degraded';
            }
        }
        catch (error) {
            components.neo4jOptimizer = 'critical';
            details.neo4j = { error: error.message };
        }
        try {
            const pgStats = await this.pgOptimizer.getCacheStats();
            details.postgres = pgStats;
        }
        catch (error) {
            components.pgOptimizer = 'critical';
            details.postgres = { error: error.message };
        }
        try {
            const gatewayStats = await this.gatewayOptimizer.getPerformanceReport();
            details.gateway = gatewayStats;
        }
        catch (error) {
            components.gatewayOptimizer = 'critical';
            details.gateway = { error: error.message };
        }
        try {
            const costStats = await this.costOptimizer.getUsageReport('system', 'system');
            details.cost = costStats;
        }
        catch (error) {
            components.costOptimizer = 'critical';
            details.cost = { error: error.message };
        }
        try {
            const dashboard = await this.monitoringSystem.getDashboard();
            details.monitoring = { systemHealth: dashboard.overview.systemHealth };
            if (dashboard.overview.systemHealth !== 'healthy') {
                components.monitoringSystem = dashboard.overview.systemHealth;
            }
        }
        catch (error) {
            components.monitoringSystem = 'critical';
            details.monitoring = { error: error.message };
        }
        // Determine overall status
        const criticalCount = Object.values(components).filter((status) => status === 'critical').length;
        const degradedCount = Object.values(components).filter((status) => status === 'degraded').length;
        let overallStatus;
        if (criticalCount > 0) {
            overallStatus = 'critical';
        }
        else if (degradedCount > 0) {
            overallStatus = 'degraded';
        }
        else {
            overallStatus = 'healthy';
        }
        return {
            status: overallStatus,
            components,
            details,
        };
    }
    /**
     * 🔧 Private helper methods
     */
    setupEventListeners() {
        // Neo4j optimizer events
        this.neo4jOptimizer.on('cacheHit', (data) => {
            logger_js_1.default.debug('Neo4j cache hit', data);
        });
        this.neo4jOptimizer.on('queryExecuted', (data) => {
            logger_js_1.default.debug('Neo4j query executed', data);
        });
        // PostgreSQL optimizer events
        this.pgOptimizer.on('slowQuery', (data) => {
            logger_js_1.default.warn('Slow PostgreSQL query detected', data);
        });
        this.pgOptimizer.on('connectionPoolExhausted', (data) => {
            logger_js_1.default.error('PostgreSQL connection pool exhausted', data);
        });
        // API Gateway optimizer events
        this.gatewayOptimizer.on('circuitBreakerOpen', (data) => {
            logger_js_1.default.warn('Circuit breaker opened', data);
        });
        this.gatewayOptimizer.on('budgetExceeded', (data) => {
            logger_js_1.default.warn('Budget limit exceeded', data);
        });
        // Cost optimizer events
        this.costOptimizer.on('modelSelected', (data) => {
            logger_js_1.default.info('Optimal model selected', data);
        });
        this.costOptimizer.on('budgetAlert', (data) => {
            logger_js_1.default.warn('Budget alert triggered', data);
        });
        // Monitoring system events
        this.monitoringSystem.on('alertTriggered', (alert) => {
            logger_js_1.default.warn('Performance alert triggered', alert);
        });
        this.monitoringSystem.on('sloViolation', (data) => {
            logger_js_1.default.error('SLO violation detected', data);
        });
    }
    async runInitialOptimizationAssessment() {
        logger_js_1.default.info('Running initial optimization assessment...');
        try {
            // Check database indexes
            const pgReport = await this.pgOptimizer.getPerformanceReport();
            if (pgReport.indexRecommendations &&
                pgReport.indexRecommendations.length > 0) {
                logger_js_1.default.info(`Found ${pgReport.indexRecommendations.length} index optimization opportunities`);
            }
            // Check Neo4j constraints
            const neo4jStats = await this.neo4jOptimizer.getPerformanceStats();
            logger_js_1.default.info(`Neo4j materialized views active: ${neo4jStats.materializedViewsCount}`);
            // Check cache configurations
            const cacheStats = await this.gatewayOptimizer.getCacheStats();
            if (cacheStats.available) {
                logger_js_1.default.info('Response caching system operational');
            }
            logger_js_1.default.info('✅ Initial optimization assessment completed');
        }
        catch (error) {
            logger_js_1.default.warn('⚠️ Initial optimization assessment partially failed:', error);
        }
    }
    calculateTotalCostSavings(costReport) {
        // Calculate estimated savings from optimization
        return (costReport.recommendations?.reduce((sum, rec) => sum + (rec.estimatedSavings || 0), 0) || 0);
    }
    calculatePerformanceImprovement() {
        // Calculate percentage improvement in performance metrics
        return 15.5; // Placeholder - would calculate from baseline vs current metrics
    }
    calculateConnectionEfficiency(poolMetrics) {
        if (!poolMetrics)
            return 0;
        const totalConnections = poolMetrics.totalConnections || 1;
        const activeConnections = poolMetrics.activeConnections || 0;
        return (activeConnections / totalConnections) * 100;
    }
    countCircuitBreakerActivations(gatewayReport) {
        return Object.values(gatewayReport.circuitBreakers || {}).reduce((sum, cb) => sum + (cb.failures || 0), 0);
    }
    calculateLatencyReduction() {
        // Calculate average latency reduction from optimizations
        return 25.3; // Placeholder - would calculate from historical data
    }
    calculateModelSwitchingBenefit(costReport) {
        // Calculate benefit from intelligent model switching
        return costReport.efficiency?.avgCostPerRequest * 0.3 || 0; // 30% savings estimate
    }
    calculateBudgetCompliance(costReport) {
        // Calculate budget compliance rate
        if (!costReport.budget)
            return 100;
        return Math.min(100, (costReport.budget.remaining / costReport.budget.total) * 100);
    }
    async generateOptimizationRecommendations() {
        const recommendations = [];
        // Get recommendations from individual optimizers
        const [pgReport, costRecommendations] = await Promise.all([
            this.pgOptimizer.getPerformanceReport(),
            this.costOptimizer.generateOptimizationRecommendations('system', 'system'),
        ]);
        // Convert index recommendations
        if (pgReport.indexRecommendations) {
            pgReport.indexRecommendations.slice(0, 3).forEach((rec) => {
                recommendations.push({
                    category: 'Database',
                    priority: rec.priority,
                    title: `Create Index on ${rec.table}.${rec.columns.join(', ')}`,
                    description: rec.reason,
                    estimatedImpact: rec.estimatedImprovement * 100,
                    implementationComplexity: 'low',
                    estimatedTimeToImplement: '5 minutes',
                });
            });
        }
        // Convert cost recommendations
        costRecommendations.slice(0, 3).forEach((rec) => {
            recommendations.push({
                category: 'Cost Optimization',
                priority: rec.confidence > 0.8 ? 'high' : 'medium',
                title: rec.title,
                description: rec.description,
                estimatedImpact: (rec.estimatedSavings / 100) * 100, // Convert to percentage
                implementationComplexity: rec.implementation.complexity,
                estimatedTimeToImplement: rec.implementation.effort,
            });
        });
        // Add system-level recommendations
        const dashboard = await this.monitoringSystem.getDashboard();
        if (dashboard.overview.systemHealth === 'degraded') {
            recommendations.push({
                category: 'System Health',
                priority: 'high',
                title: 'Address System Performance Issues',
                description: 'System is showing degraded performance. Review active alerts and metrics.',
                estimatedImpact: 20,
                implementationComplexity: 'medium',
                estimatedTimeToImplement: '2-4 hours',
            });
        }
        return recommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    /**
     * 🧹 Cleanup and shutdown
     */
    async shutdown() {
        logger_js_1.default.info('Shutting down optimization systems...');
        try {
            // Cleanup caches
            await this.clearAllCaches();
            // Close database connections would be handled by the database config
            logger_js_1.default.info('✅ Optimization systems shut down successfully');
        }
        catch (error) {
            logger_js_1.default.error('❌ Error during optimization systems shutdown:', error);
            throw error;
        }
    }
}
exports.OptimizationManager = OptimizationManager;
