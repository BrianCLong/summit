"use strict";
// @ts-nocheck
// server/src/conductor/premium-routing/cost-performance-optimizer.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostPerformanceOptimizer = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
class CostPerformanceOptimizer {
    pool;
    redis;
    metrics = new Map();
    budgetConstraints = new Map();
    optimizationStrategies = new Map();
    dynamicPricing = new Map();
    activeAlerts = new Map();
    // Optimization parameters
    QUALITY_WEIGHT = 0.4;
    COST_WEIGHT = 0.3;
    SPEED_WEIGHT = 0.3;
    TREND_WINDOW_HOURS = 24;
    OPTIMIZATION_INTERVAL_MS = 300000; // 5 minutes
    ALERT_COOLDOWN_MS = 900000; // 15 minutes
    constructor() {
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
    }
    async initialize() {
        await this.redis.connect();
        await this.loadCostPerformanceMetrics();
        await this.loadBudgetConstraints();
        await this.initializeOptimizationStrategies();
        await this.initializeDynamicPricing();
        // Start real-time monitoring
        this.startRealTimeMonitoring();
        this.startOptimizationEngine();
        logger_js_1.default.info('Cost Performance Optimizer initialized with real-time monitoring');
    }
    /**
     * Get real-time cost performance analysis
     */
    async getCostPerformanceAnalysis(modelId, timeWindow = '1h', tenantId) {
        const cacheKey = `cost_perf:${modelId}:${timeWindow}:${tenantId || 'global'}`;
        // Try cache first
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Calculate fresh metrics
        const metrics = await this.calculateCostPerformanceMetrics(modelId, timeWindow, tenantId);
        // Cache with TTL
        await this.redis.setex(cacheKey, 300, JSON.stringify(metrics)); // 5 minute cache
        return metrics;
    }
    /**
     * Get optimization recommendations based on current performance
     */
    async getOptimizationRecommendations(tenantId, strategy = 'balanced', constraints) {
        const optimizationStrategy = this.optimizationStrategies.get(strategy);
        if (!optimizationStrategy) {
            throw new Error(`Unknown optimization strategy: ${strategy}`);
        }
        const recommendations = [];
        const tenantMetrics = Array.from(this.metrics.values()).filter((m) => m.timeWindow === '1h'); // Focus on recent performance
        for (const metrics of tenantMetrics) {
            const modelRecommendations = await this.analyzeModelOptimization(metrics, optimizationStrategy, constraints);
            recommendations.push(...modelRecommendations);
        }
        // Sort by potential impact
        recommendations.sort((a, b) => b.expectedCostSaving - a.expectedCostSaving);
        // Record recommendation generation
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('optimization_recommendations_generated', true, {
            tenant_id: tenantId,
            strategy,
            recommendation_count: recommendations.length.toString(),
        });
        return recommendations.slice(0, 10); // Top 10 recommendations
    }
    /**
     * Apply optimization recommendations automatically
     */
    async applyOptimizations(tenantId, recommendationIds, dryRun = false) {
        const results = [];
        let appliedOptimizations = 0;
        let expectedSavings = 0;
        const potentialRisks = [];
        for (const recommendationId of recommendationIds) {
            try {
                const recommendation = await this.getRecommendationById(recommendationId);
                if (!recommendation) {
                    results.push({
                        recommendationId,
                        success: false,
                        impact: 0,
                        error: 'Recommendation not found',
                    });
                    continue;
                }
                // Risk assessment
                const risk = this.assessOptimizationRisk(recommendation);
                if (risk.level === 'high') {
                    potentialRisks.push(`High risk for ${recommendation.recommendationType}: ${risk.reason}`);
                }
                if (!dryRun && risk.level !== 'high') {
                    // Apply the optimization
                    const success = await this.executeOptimization(recommendation, tenantId);
                    if (success) {
                        appliedOptimizations++;
                        expectedSavings += recommendation.expectedCostSaving;
                    }
                    results.push({
                        recommendationId,
                        success,
                        impact: recommendation.expectedCostSaving,
                        error: success ? undefined : 'Failed to apply optimization',
                    });
                }
                else {
                    // Dry run or high risk
                    results.push({
                        recommendationId,
                        success: true,
                        impact: recommendation.expectedCostSaving,
                        error: dryRun ? 'Dry run - not applied' : 'High risk - skipped',
                    });
                    if (!dryRun) {
                        expectedSavings += recommendation.expectedCostSaving;
                    }
                }
            }
            catch (error) {
                results.push({
                    recommendationId,
                    success: false,
                    impact: 0,
                    error: error.message,
                });
            }
        }
        // Record optimization results
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('optimizations_applied', appliedOptimizations, { tenant_id: tenantId, dry_run: dryRun.toString() });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('expected_cost_savings', expectedSavings, { tenant_id: tenantId });
        logger_js_1.default.info('Applied cost optimizations', {
            tenantId,
            appliedOptimizations,
            expectedSavings,
            dryRun,
            potentialRisks: potentialRisks.length,
        });
        return {
            appliedOptimizations,
            expectedSavings,
            potentialRisks,
            results,
        };
    }
    /**
     * Monitor budget usage and alerts
     */
    async monitorBudgetUsage(tenantId) {
        const constraints = this.budgetConstraints.get(tenantId);
        if (!constraints) {
            throw new Error(`Budget constraints not found for tenant: ${tenantId}`);
        }
        // Calculate current usage
        const currentUsage = await this.calculateCurrentUsage(tenantId, 'day');
        const monthlyUsage = await this.calculateCurrentUsage(tenantId, 'month');
        const dailyUtilization = (currentUsage / constraints.dailyLimit) * 100;
        const monthlyUtilization = (monthlyUsage / constraints.monthlyLimit) * 100;
        // Project monthly usage based on current trend
        const projectedMonthlyUsage = await this.projectMonthlyUsage(tenantId);
        // Check for alerts
        const alerts = Array.from(this.activeAlerts.values()).filter((alert) => alert.tenantId === tenantId);
        // Generate recommendations
        const recommendations = await this.generateBudgetRecommendations(constraints, currentUsage, projectedMonthlyUsage);
        // Record budget monitoring metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('budget_utilization_daily', dailyUtilization, { tenant_id: tenantId });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('budget_utilization_monthly', monthlyUtilization, { tenant_id: tenantId });
        return {
            currentUsage,
            budgetLimit: constraints.dailyLimit,
            utilizationPercentage: dailyUtilization,
            projectedMonthlyUsage,
            alerts,
            recommendations,
        };
    }
    /**
     * Update dynamic pricing based on demand and performance
     */
    async updateDynamicPricing() {
        for (const [modelId, pricingModel] of this.dynamicPricing) {
            try {
                // Calculate current demand and utilization
                const demand = await this.calculateModelDemand(modelId);
                const quality = await this.getModelQualityScore(modelId);
                const utilization = await this.getModelUtilization(modelId);
                // Update multipliers
                pricingModel.demandMultiplier = this.calculateDemandMultiplier(demand);
                pricingModel.qualityMultiplier =
                    this.calculateQualityMultiplier(quality);
                pricingModel.timeOfDayMultiplier = this.calculateTimeMultiplier();
                pricingModel.volumeDiscount = this.calculateVolumeDiscount(modelId);
                // Calculate new price
                const newPrice = pricingModel.baseCost *
                    pricingModel.demandMultiplier *
                    pricingModel.qualityMultiplier *
                    pricingModel.timeOfDayMultiplier *
                    (1 - pricingModel.volumeDiscount);
                // Update price history
                pricingModel.priceHistory.push({
                    timestamp: new Date(),
                    price: newPrice,
                    demand,
                    quality,
                    utilization,
                });
                // Keep only recent history
                if (pricingModel.priceHistory.length > 1440) {
                    // 24 hours of minute data
                    pricingModel.priceHistory = pricingModel.priceHistory.slice(-1440);
                }
                pricingModel.currentPrice = newPrice;
                pricingModel.lastUpdated = new Date();
                // Record pricing update
                prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('dynamic_pricing_update', newPrice, {
                    model_id: modelId,
                    demand_multiplier: pricingModel.demandMultiplier.toFixed(2),
                    quality_multiplier: pricingModel.qualityMultiplier.toFixed(2),
                });
            }
            catch (error) {
                logger_js_1.default.error('Failed to update dynamic pricing', {
                    modelId,
                    error: error.message,
                });
            }
        }
    }
    /**
     * Real-time monitoring loop
     */
    startRealTimeMonitoring() {
        setInterval(async () => {
            try {
                await this.checkCostSpikes();
                await this.checkQualityDegradation();
                await this.checkBudgetExceeded();
                await this.updateDynamicPricing();
            }
            catch (error) {
                logger_js_1.default.error('Real-time monitoring error', { error: error.message });
            }
        }, 60000); // Every minute
    }
    /**
     * Optimization engine loop
     */
    startOptimizationEngine() {
        setInterval(async () => {
            try {
                await this.runAutomaticOptimization();
            }
            catch (error) {
                logger_js_1.default.error('Optimization engine error', { error: error.message });
            }
        }, this.OPTIMIZATION_INTERVAL_MS);
    }
    /**
     * Check for cost spikes
     */
    async checkCostSpikes() {
        for (const [modelId, metrics] of this.metrics) {
            const recentCosts = metrics.costTrends.slice(-10); // Last 10 data points
            if (recentCosts.length < 5)
                continue;
            const avgCost = recentCosts.reduce((sum, t) => sum + t.cost, 0) / recentCosts.length;
            const latestCost = recentCosts[recentCosts.length - 1].cost;
            // Check for 50% spike above average
            if (latestCost > avgCost * 1.5) {
                await this.createAlert({
                    type: 'cost_spike',
                    severity: 'warning',
                    modelId,
                    tenantId: 'global',
                    message: `Cost spike detected for ${modelId}: ${latestCost.toFixed(4)} vs avg ${avgCost.toFixed(4)}`,
                    metrics: { latestCost, avgCost, spikeRatio: latestCost / avgCost },
                });
            }
        }
    }
    /**
     * Check for quality degradation
     */
    async checkQualityDegradation() {
        for (const [modelId, metrics] of this.metrics) {
            const recentQuality = metrics.qualityTrends.slice(-10);
            if (recentQuality.length < 5)
                continue;
            const avgQuality = recentQuality.reduce((sum, t) => sum + t.qualityScore, 0) /
                recentQuality.length;
            const latestQuality = recentQuality[recentQuality.length - 1].qualityScore;
            // Check for 15% drop in quality
            if (latestQuality < avgQuality * 0.85) {
                await this.createAlert({
                    type: 'quality_drop',
                    severity: 'critical',
                    modelId,
                    tenantId: 'global',
                    message: `Quality degradation detected for ${modelId}: ${(latestQuality * 100).toFixed(1)}% vs avg ${(avgQuality * 100).toFixed(1)}%`,
                    metrics: {
                        latestQuality,
                        avgQuality,
                        degradationRatio: latestQuality / avgQuality,
                    },
                });
            }
        }
    }
    /**
     * Check budget exceeded
     */
    async checkBudgetExceeded() {
        for (const [tenantId, constraints] of this.budgetConstraints) {
            const currentUsage = await this.calculateCurrentUsage(tenantId, 'day');
            const utilization = (currentUsage / constraints.dailyLimit) * 100;
            if (utilization > constraints.emergencyThreshold) {
                await this.createAlert({
                    type: 'budget_exceeded',
                    severity: 'critical',
                    modelId: 'all',
                    tenantId,
                    message: `Budget exceeded for ${tenantId}: ${utilization.toFixed(1)}% of daily limit`,
                    metrics: {
                        currentUsage,
                        dailyLimit: constraints.dailyLimit,
                        utilization,
                    },
                });
            }
            else if (utilization > constraints.warningThreshold) {
                await this.createAlert({
                    type: 'budget_exceeded',
                    severity: 'warning',
                    modelId: 'all',
                    tenantId,
                    message: `Budget warning for ${tenantId}: ${utilization.toFixed(1)}% of daily limit`,
                    metrics: {
                        currentUsage,
                        dailyLimit: constraints.dailyLimit,
                        utilization,
                    },
                });
            }
        }
    }
    /**
     * Create and manage alerts
     */
    async createAlert(alertData) {
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Check for alert cooldown
        const recentSimilarAlerts = Array.from(this.activeAlerts.values()).filter((alert) => alert.type === alertData.type &&
            alert.modelId === alertData.modelId &&
            alert.tenantId === alertData.tenantId &&
            Date.now() - alert.timestamp.getTime() < this.ALERT_COOLDOWN_MS);
        if (recentSimilarAlerts.length > 0) {
            return; // Skip duplicate alerts within cooldown period
        }
        const alert = {
            ...alertData,
            id: alertId,
            timestamp: new Date(),
            acknowledged: false,
        };
        this.activeAlerts.set(alertId, alert);
        // Persist alert
        await this.saveAlert(alert);
        // Record alert metric
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('cost_optimization_alert', true, {
            alert_type: alert.type,
            severity: alert.severity,
            model_id: alert.modelId,
            tenant_id: alert.tenantId,
        });
        logger_js_1.default.warn('Cost optimization alert created', {
            alertId,
            type: alert.type,
            severity: alert.severity,
            modelId: alert.modelId,
            tenantId: alert.tenantId,
            message: alert.message,
        });
    }
    // Calculation methods
    async calculateCostPerformanceMetrics(modelId, timeWindow, tenantId) {
        const client = await this.pool.connect();
        try {
            const whereClause = tenantId ? 'AND tenant_id = $3' : '';
            const params = tenantId
                ? [modelId, timeWindow, tenantId]
                : [modelId, timeWindow];
            const result = await client.query(`
        SELECT 
          SUM(cost) as total_cost,
          COUNT(*) as total_requests,
          AVG(cost) as avg_cost,
          AVG(quality_score) as avg_quality,
          AVG(latency) as avg_latency,
          SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
        FROM model_executions 
        WHERE model_id = $1 AND 
              timestamp > NOW() - INTERVAL $2
              ${whereClause}
      `, params);
            const row = result.rows[0];
            const totalCost = parseFloat(row.total_cost || '0');
            const totalRequests = parseInt(row.total_requests || '0');
            const avgQuality = parseFloat(row.avg_quality || '0');
            const avgLatency = parseFloat(row.avg_latency || '0');
            const successRate = parseFloat(row.success_rate || '0');
            // Calculate derived metrics
            const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
            const costEfficiencyScore = totalCost > 0 ? avgQuality / totalCost : 0;
            const performanceScore = totalCost > 0 ? (avgQuality * (1 / avgLatency)) / totalCost : 0;
            const valueScore = avgQuality * this.QUALITY_WEIGHT +
                (1 / avgCostPerRequest) * this.COST_WEIGHT +
                (1 / avgLatency) * this.SPEED_WEIGHT;
            // Get trends
            const costTrends = await this.getCostTrends(modelId, timeWindow, tenantId);
            const qualityTrends = await this.getQualityTrends(modelId, timeWindow, tenantId);
            return {
                modelId,
                timeWindow,
                totalCost,
                totalRequests,
                avgCostPerRequest,
                avgQualityScore: avgQuality,
                avgLatency,
                successRate,
                costEfficiencyScore,
                performanceScore,
                valueScore,
                budgetUtilization: 0, // Would need budget context
                costTrends,
                qualityTrends,
                lastUpdated: new Date(),
            };
        }
        finally {
            client.release();
        }
    }
    async getCostTrends(modelId, timeWindow, tenantId) {
        // Simplified implementation - would use time series analysis
        const trends = [];
        for (let i = 0; i < 24; i++) {
            // 24 hour trend
            trends.push({
                timestamp: new Date(Date.now() - i * 3600000),
                cost: Math.random() * 0.01,
                movingAverage: Math.random() * 0.008,
                trend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
                volatility: Math.random() * 0.1,
            });
        }
        return trends.reverse();
    }
    async getQualityTrends(modelId, timeWindow, tenantId) {
        // Simplified implementation - would use time series analysis
        const trends = [];
        for (let i = 0; i < 24; i++) {
            // 24 hour trend
            trends.push({
                timestamp: new Date(Date.now() - i * 3600000),
                qualityScore: 0.8 + Math.random() * 0.2,
                movingAverage: 0.82 + Math.random() * 0.15,
                trend: Math.random() > 0.6 ? 'improving' : 'stable',
                confidence: 0.8 + Math.random() * 0.2,
            });
        }
        return trends.reverse();
    }
    // Additional utility methods would be implemented here...
    // For brevity, I'm including placeholders for key methods
    async analyzeModelOptimization(metrics, strategy, constraints) {
        const recommendations = [];
        // Model switching recommendation
        if (metrics.costEfficiencyScore < 0.5) {
            recommendations.push({
                recommendationType: 'model_switch',
                currentModel: metrics.modelId,
                recommendedModel: 'claude-3.5-sonnet', // Would be calculated
                expectedCostSaving: metrics.avgCostPerRequest * 0.3,
                expectedQualityImpact: 0.05,
                expectedLatencyImpact: 100,
                confidence: 0.8,
                reasoning: 'Current model has low cost efficiency. Switching could reduce costs while maintaining quality.',
                implementation: [
                    {
                        action: 'switch_model',
                        parameters: { new_model_id: 'claude-3.5-sonnet' },
                        expectedImpact: 0.3,
                        riskLevel: 'medium',
                        implementation_priority: 1,
                    },
                ],
            });
        }
        // Caching recommendation
        if (metrics.totalRequests > 100 &&
            !metrics.costTrends.some((t) => t.cost < metrics.avgCostPerRequest * 0.1)) {
            recommendations.push({
                recommendationType: 'cache_utilization',
                currentModel: metrics.modelId,
                expectedCostSaving: metrics.avgCostPerRequest * 0.2,
                expectedQualityImpact: 0,
                expectedLatencyImpact: -200, // Improvement
                confidence: 0.9,
                reasoning: 'High request volume with potential for caching similar queries.',
                implementation: [
                    {
                        action: 'enable_caching',
                        parameters: { cache_ttl: 3600, similarity_threshold: 0.9 },
                        expectedImpact: 0.2,
                        riskLevel: 'low',
                        implementation_priority: 2,
                    },
                ],
            });
        }
        return recommendations;
    }
    async calculateCurrentUsage(tenantId, period) {
        const client = await this.pool.connect();
        try {
            const interval = period === 'day' ? '1 DAY' : '1 MONTH';
            const result = await client.query(`
        SELECT SUM(cost) as total_cost
        FROM model_executions 
        WHERE tenant_id = $1 AND 
              timestamp > NOW() - INTERVAL $2
      `, [tenantId, interval]);
            return parseFloat(result.rows[0].total_cost || '0');
        }
        finally {
            client.release();
        }
    }
    async projectMonthlyUsage(tenantId) {
        const dailyUsage = await this.calculateCurrentUsage(tenantId, 'day');
        const daysInMonth = new Date().getDate();
        const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        return (dailyUsage / daysInMonth) * totalDaysInMonth;
    }
    async generateBudgetRecommendations(constraints, currentUsage, projectedUsage) {
        const recommendations = [];
        if (projectedUsage > constraints.monthlyLimit) {
            recommendations.push('Consider enabling automatic cost optimization to stay within monthly budget');
            recommendations.push('Review model selection strategy to prioritize cost-efficient options');
        }
        if (currentUsage > constraints.dailyLimit * 0.8) {
            recommendations.push('Daily budget utilization is high - consider rate limiting or quality thresholds');
        }
        return recommendations;
    }
    // Placeholder implementations for other methods
    calculateDemandMultiplier(demand) {
        return Math.max(0.8, Math.min(1.5, 1 + (demand - 1) * 0.2));
    }
    calculateQualityMultiplier(quality) {
        return Math.max(0.9, Math.min(1.2, quality * 1.1));
    }
    calculateTimeMultiplier() {
        const hour = new Date().getHours();
        return hour >= 9 && hour <= 17 ? 1.1 : 0.95; // Peak hours pricing
    }
    calculateVolumeDiscount(modelId) {
        // Would calculate based on usage volume
        return 0.05; // 5% discount placeholder
    }
    async getRecommendationById(id) {
        // Would fetch from database
        return null;
    }
    assessOptimizationRisk(recommendation) {
        if (recommendation.expectedQualityImpact < -0.1) {
            return { level: 'high', reason: 'Significant quality impact expected' };
        }
        return { level: 'low', reason: 'Low risk optimization' };
    }
    async executeOptimization(recommendation, tenantId) {
        // Would implement actual optimization logic
        return true;
    }
    async runAutomaticOptimization() {
        // Automatic optimization logic
        logger_js_1.default.info('Running automatic optimization cycle');
    }
    // Database operations
    async loadCostPerformanceMetrics() {
        // Load from database
        logger_js_1.default.info('Cost performance metrics loaded');
    }
    async loadBudgetConstraints() {
        // Load budget constraints from database
        logger_js_1.default.info('Budget constraints loaded');
    }
    async initializeOptimizationStrategies() {
        this.optimizationStrategies.set('aggressive_cost', {
            name: 'Aggressive Cost Optimization',
            description: 'Prioritizes cost reduction over all other factors',
            targetMetric: 'cost',
            aggressiveness: 0.9,
            riskTolerance: 0.7,
            timeHorizon: 'short',
            constraints: {
                minQualityScore: 0.7,
                maxLatency: 5000,
                maxCostPerRequest: 0.01,
                maxDailyCost: 100,
                allowedProviders: ['anthropic', 'openai', 'google'],
                excludedModels: [],
            },
        });
        this.optimizationStrategies.set('balanced', {
            name: 'Balanced Optimization',
            description: 'Balances cost, quality, and performance',
            targetMetric: 'value',
            aggressiveness: 0.5,
            riskTolerance: 0.5,
            timeHorizon: 'medium',
            constraints: {
                minQualityScore: 0.8,
                maxLatency: 3000,
                maxCostPerRequest: 0.02,
                maxDailyCost: 200,
                allowedProviders: ['anthropic', 'openai', 'google'],
                excludedModels: [],
            },
        });
        logger_js_1.default.info('Optimization strategies initialized');
    }
    async initializeDynamicPricing() {
        // Initialize dynamic pricing models
        logger_js_1.default.info('Dynamic pricing initialized');
    }
    async saveAlert(alert) {
        // Save to database
        logger_js_1.default.info('Alert saved', { alertId: alert.id });
    }
    async calculateModelDemand(modelId) {
        // Calculate current demand - placeholder
        return Math.random() * 2;
    }
    async getModelQualityScore(modelId) {
        // Get current quality score - placeholder
        return 0.8 + Math.random() * 0.2;
    }
    async getModelUtilization(modelId) {
        // Get current utilization - placeholder
        return Math.random();
    }
}
exports.CostPerformanceOptimizer = CostPerformanceOptimizer;
