"use strict";
// @ts-nocheck
// server/src/conductor/premium-routing/premium-model-router.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PremiumModelRouter = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
class PremiumModelRouter {
    pool;
    redis;
    availableModels;
    performanceData;
    loadBalancers;
    constructor() {
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
        this.availableModels = new Map();
        this.performanceData = new Map();
        this.loadBalancers = new Map();
    }
    async connect() {
        await this.redis.connect();
        await this.loadPremiumModels();
        await this.loadPerformanceData();
        await this.initializeLoadBalancers();
    }
    /**
     * Core routing method - selects optimal premium model for maximum value
     */
    async routeToOptimalModel(request) {
        const startTime = Date.now();
        try {
            // Step 1: Filter candidate models based on capabilities and constraints
            const candidateModels = await this.filterCandidateModels(request);
            if (candidateModels.length === 0) {
                throw new Error('No models meet the specified requirements');
            }
            // Step 2: Score models using multi-criteria decision analysis
            const scoredModels = await this.scoreModels(candidateModels, request);
            // Step 3: Apply Thompson Sampling for exploitation/exploration balance
            const selectedModel = await this.selectModelWithThompsonSampling(scoredModels, request);
            // Step 4: Validate availability and rate limits
            const availabilityCheck = await this.validateModelAvailability(selectedModel, request);
            if (!availabilityCheck.available) {
                // Fallback to next best model
                const fallbackModel = scoredModels.find((m) => m.model.id !== selectedModel.id);
                if (!fallbackModel) {
                    throw new Error('No available models after rate limit check');
                }
                return this.createRoutingDecision(fallbackModel.model, fallbackModel.score, request, scoredModels);
            }
            // Step 5: Create routing decision with fallbacks
            const decision = this.createRoutingDecision(selectedModel, scoredModels[0].score, request, scoredModels);
            // Step 6: Reserve model capacity and update load balancers
            await this.reserveModelCapacity(selectedModel, request);
            // Update routing metrics
            const routingTime = Date.now() - startTime;
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('premium_routing_latency', routingTime, {
                selected_model: selectedModel.name,
                tenant_id: request.context.tenantId,
                task_type: request.context.taskType,
            });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('premium_model_routed', true, {
                model_name: selectedModel.name,
                provider: selectedModel.provider,
                tier: selectedModel.tier,
                tenant_id: request.context.tenantId,
            });
            logger_js_1.default.info('Premium model routing completed', {
                selectedModel: selectedModel.name,
                confidence: decision.confidence,
                expectedCost: decision.expectedCost,
                routingTime,
                taskType: request.context.taskType,
            });
            return decision;
        }
        catch (error) {
            const routingTime = Date.now() - startTime;
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('premium_routing_error', false, {
                error_type: error.name,
                tenant_id: request.context.tenantId,
            });
            logger_js_1.default.error('Premium model routing failed', {
                error: error.message,
                query: request.query.substring(0, 100),
                taskType: request.context.taskType,
                routingTime,
            });
            throw error;
        }
    }
    /**
     * Filter models based on capabilities and constraints
     */
    async filterCandidateModels(request) {
        const models = Array.from(this.availableModels.values());
        return models.filter((model) => {
            // Check required capabilities
            if (request.constraints.requiredCapabilities) {
                const hasAllCapabilities = request.constraints.requiredCapabilities.every((cap) => model.capabilities.includes(cap));
                if (!hasAllCapabilities)
                    return false;
            }
            // Check provider preferences
            if (request.constraints.preferredProviders &&
                !request.constraints.preferredProviders.includes(model.provider)) {
                return false;
            }
            // Check excluded models
            if (request.constraints.excludedModels &&
                request.constraints.excludedModels.includes(model.id)) {
                return false;
            }
            // Check budget constraints
            const estimatedCost = this.estimateModelCost(model, request);
            if (request.constraints.maxCost &&
                estimatedCost > request.constraints.maxCost) {
                return false;
            }
            // Check context window requirements
            const estimatedTokens = this.estimateTokenUsage(request.query, request.context.expectedOutputLength);
            if (estimatedTokens > model.contextWindow) {
                return false;
            }
            // Check task type compatibility
            const taskCompatible = this.isTaskCompatible(model, request.context.taskType);
            if (!taskCompatible)
                return false;
            return true;
        });
    }
    /**
     * Score models using multi-criteria decision analysis (MCDA)
     */
    async scoreModels(models, request) {
        const scoredModels = [];
        for (const model of models) {
            const performance = this.performanceData.get(`${model.id}:${request.context.taskType}`);
            // Multi-criteria scoring with weights based on request context
            const weights = this.calculateScoringWeights(request);
            const qualityScore = this.calculateQualityScore(model, performance, request);
            const costScore = this.calculateCostScore(model, request);
            const speedScore = this.calculateSpeedScore(model, performance, request);
            const reliabilityScore = this.calculateReliabilityScore(model, performance);
            const specializationScore = this.calculateSpecializationScore(model, request);
            const overallScore = qualityScore * weights.quality +
                costScore * weights.cost +
                speedScore * weights.speed +
                reliabilityScore * weights.reliability +
                specializationScore * weights.specialization;
            scoredModels.push({
                model,
                score: overallScore,
                breakdown: {
                    quality: qualityScore,
                    cost: costScore,
                    speed: speedScore,
                    reliability: reliabilityScore,
                    specialization: specializationScore,
                    weights,
                },
            });
        }
        // Sort by score (descending)
        return scoredModels.sort((a, b) => b.score - a.score);
    }
    /**
     * Thompson Sampling for exploration/exploitation balance
     */
    async selectModelWithThompsonSampling(scoredModels, request) {
        // Get historical performance for Thompson Sampling
        const sampledScores = [];
        for (const { model, score } of scoredModels) {
            const performance = this.performanceData.get(`${model.id}:${request.context.taskType}`);
            if (performance && performance.sampleSize > 10) {
                // Use Beta distribution based on historical success/failure
                const alpha = performance.successRate * performance.sampleSize + 1;
                const beta = (1 - performance.successRate) * performance.sampleSize + 1;
                const sampledReward = this.sampleBeta(alpha, beta);
                // Combine with MCDA score
                const combinedScore = score * 0.7 + sampledReward * 0.3;
                sampledScores.push({ model, sampledScore: combinedScore });
            }
            else {
                // Cold start: add optimistic prior for exploration
                const optimisticScore = score + 0.1; // Small exploration bonus
                sampledScores.push({ model, sampledScore: optimisticScore });
            }
        }
        // Select model with highest sampled score
        sampledScores.sort((a, b) => b.sampledScore - a.sampledScore);
        logger_js_1.default.debug('Thompson sampling selection', {
            topModel: sampledScores[0].model.name,
            sampledScore: sampledScores[0].sampledScore,
            taskType: request.context.taskType,
        });
        return sampledScores[0].model;
    }
    /**
     * Validate model availability considering rate limits and current load
     */
    async validateModelAvailability(model, request) {
        // Check rate limits
        const rateLimitKey = `rate_limit:${model.id}:${request.context.tenantId}`;
        const currentUsage = await this.redis.hgetall(rateLimitKey);
        const requestsThisMinute = parseInt(currentUsage.requests || '0');
        const tokensThisMinute = parseInt(currentUsage.tokens || '0');
        if (requestsThisMinute >= model.rateLimits.requestsPerMinute) {
            return {
                available: false,
                reason: 'Request rate limit exceeded',
                retryAfter: 60, // seconds
            };
        }
        const estimatedTokens = this.estimateTokenUsage(request.query, request.context.expectedOutputLength);
        if (tokensThisMinute + estimatedTokens > model.rateLimits.tokensPerMinute) {
            return {
                available: false,
                reason: 'Token rate limit would be exceeded',
                retryAfter: 60,
            };
        }
        // Check load balancer
        const loadBalancer = this.loadBalancers.get(model.id);
        if (loadBalancer && !loadBalancer.canAcceptRequest()) {
            return {
                available: false,
                reason: 'Model at capacity',
                retryAfter: 30,
            };
        }
        return { available: true };
    }
    /**
     * Create comprehensive routing decision
     */
    createRoutingDecision(selectedModel, confidence, request, allScoredModels) {
        const expectedCost = this.estimateModelCost(selectedModel, request);
        const expectedLatency = this.estimateLatency(selectedModel, request);
        // Prepare fallback models (next 3 highest scored)
        const fallbackModels = allScoredModels
            .filter((m) => m.model.id !== selectedModel.id)
            .slice(0, 3)
            .map((m) => m.model);
        // Determine optimization target based on request
        let optimizationTarget;
        if (request.context.urgency === 'critical') {
            optimizationTarget = 'speed';
        }
        else if (request.context.budget < expectedCost * 1.5) {
            optimizationTarget = 'cost';
        }
        else if (request.context.qualityRequirement > 0.8) {
            optimizationTarget = 'quality';
        }
        else {
            optimizationTarget = 'balanced';
        }
        const reasoning = this.generateRoutingReasoning(selectedModel, request, allScoredModels[0]?.breakdown);
        return {
            selectedModel,
            confidence,
            reasoning,
            expectedCost,
            expectedLatency,
            fallbackModels,
            routingStrategy: 'thompson_sampling_mcda',
            optimizationTarget,
        };
    }
    /**
     * Record execution results for learning
     */
    async recordExecutionResult(modelId, taskType, result) {
        try {
            // Update performance data for Thompson Sampling
            const performanceKey = `${modelId}:${taskType}`;
            const currentPerformance = this.performanceData.get(performanceKey);
            if (currentPerformance) {
                // Update existing performance data
                const newSampleSize = currentPerformance.sampleSize + 1;
                const successCount = currentPerformance.successRate * currentPerformance.sampleSize +
                    (result.success ? 1 : 0);
                const newSuccessRate = successCount / newSampleSize;
                // Exponential moving average for latency and cost
                const alpha = 0.1; // Learning rate
                const newAvgLatency = currentPerformance.avgLatency * (1 - alpha) +
                    result.actualLatency * alpha;
                const newAvgCost = currentPerformance.avgCost * (1 - alpha) + result.actualCost * alpha;
                const updatedPerformance = {
                    modelId,
                    taskType,
                    successRate: newSuccessRate,
                    avgLatency: newAvgLatency,
                    avgCost: newAvgCost,
                    qualityScore: result.qualityScore || currentPerformance.qualityScore,
                    lastUpdated: new Date(),
                    sampleSize: newSampleSize,
                };
                this.performanceData.set(performanceKey, updatedPerformance);
                // Persist to database
                await this.savePerformanceData(updatedPerformance);
            }
            else {
                // Create new performance record
                const newPerformance = {
                    modelId,
                    taskType,
                    successRate: result.success ? 1.0 : 0.0,
                    avgLatency: result.actualLatency,
                    avgCost: result.actualCost,
                    qualityScore: result.qualityScore || 0.5,
                    lastUpdated: new Date(),
                    sampleSize: 1,
                };
                this.performanceData.set(performanceKey, newPerformance);
                await this.savePerformanceData(newPerformance);
            }
            // Update load balancer
            const loadBalancer = this.loadBalancers.get(modelId);
            if (loadBalancer) {
                loadBalancer.recordCompletion(result.success);
            }
            // Update metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('model_execution_latency', result.actualLatency, { model_id: modelId, task_type: taskType });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('model_execution_cost', result.actualCost, { model_id: modelId, task_type: taskType });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('model_execution_result', result.success, {
                model_id: modelId,
                task_type: taskType,
            });
            logger_js_1.default.info('Model execution result recorded', {
                modelId,
                taskType,
                success: result.success,
                actualCost: result.actualCost,
                actualLatency: result.actualLatency,
                updatedSuccessRate: this.performanceData.get(performanceKey)?.successRate,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to record execution result', {
                error: error.message,
                modelId,
                taskType,
            });
        }
    }
    // Utility methods for scoring
    calculateScoringWeights(request) {
        const urgencyWeights = {
            critical: {
                quality: 0.4,
                cost: 0.1,
                speed: 0.4,
                reliability: 0.05,
                specialization: 0.05,
            },
            high: {
                quality: 0.35,
                cost: 0.15,
                speed: 0.35,
                reliability: 0.1,
                specialization: 0.05,
            },
            medium: {
                quality: 0.3,
                cost: 0.3,
                speed: 0.2,
                reliability: 0.15,
                specialization: 0.05,
            },
            low: {
                quality: 0.25,
                cost: 0.4,
                speed: 0.15,
                reliability: 0.15,
                specialization: 0.05,
            },
        };
        return urgencyWeights[request.context.urgency] || urgencyWeights.medium;
    }
    calculateQualityScore(model, performance, request) {
        let baseScore = model.qualityScore / 100; // Convert to 0-1
        if (performance) {
            baseScore = baseScore * 0.6 + performance.qualityScore * 0.4;
        }
        return Math.min(1, baseScore);
    }
    calculateCostScore(model, request) {
        const estimatedCost = this.estimateModelCost(model, request);
        const budgetRatio = estimatedCost / request.context.budget;
        // Inverse scoring - lower cost = higher score
        return Math.max(0, 1 - budgetRatio);
    }
    calculateSpeedScore(model, performance, request) {
        let baseScore = model.speedScore / 100;
        if (performance && request.constraints.maxLatency) {
            const latencyRatio = performance.avgLatency / request.constraints.maxLatency;
            baseScore = Math.max(0, 1 - latencyRatio);
        }
        return baseScore;
    }
    calculateReliabilityScore(model, performance) {
        if (performance) {
            return performance.successRate;
        }
        return model.reliabilityScore / 100;
    }
    calculateSpecializationScore(model, request) {
        const hasSpecialization = model.specializations.some((spec) => request.context.taskType.toLowerCase().includes(spec.toLowerCase()));
        return hasSpecialization ? 1.0 : 0.5;
    }
    estimateModelCost(model, request) {
        const estimatedTokens = this.estimateTokenUsage(request.query, request.context.expectedOutputLength);
        return estimatedTokens * model.costPerToken;
    }
    estimateLatency(model, request) {
        const performance = this.performanceData.get(`${model.id}:${request.context.taskType}`);
        return performance?.avgLatency || 2000; // Default 2s
    }
    estimateTokenUsage(query, expectedOutputLength) {
        // Simple estimation - in production would use proper tokenizer
        const inputTokens = Math.ceil(query.length / 4);
        const outputTokens = Math.ceil(expectedOutputLength / 4);
        return inputTokens + outputTokens;
    }
    isTaskCompatible(model, taskType) {
        const taskModelMap = {
            code_generation: ['chat', 'completion', 'code'],
            reasoning: ['chat', 'reasoning'],
            analysis: ['chat', 'completion'],
            vision: ['vision', 'chat'],
            embedding: ['embedding'],
        };
        const compatibleTypes = taskModelMap[taskType] || ['chat', 'completion'];
        return compatibleTypes.includes(model.modelType);
    }
    sampleBeta(alpha, beta) {
        // Simple beta distribution sampling - in production use proper statistical library
        return Math.random(); // Placeholder
    }
    generateRoutingReasoning(model, request, breakdown) {
        return (`Selected ${model.name} (${model.provider}) for ${request.context.taskType} task. ` +
            `Reasoning: Quality=${(breakdown?.quality * 100).toFixed(0)}%, ` +
            `Cost efficiency=${(breakdown?.cost * 100).toFixed(0)}%, ` +
            `Speed=${(breakdown?.speed * 100).toFixed(0)}%. ` +
            `Optimization target: ${breakdown?.weights ? Object.keys(breakdown.weights).reduce((a, b) => (breakdown.weights[a] > breakdown.weights[b] ? a : b)) : 'balanced'}.`);
    }
    async reserveModelCapacity(model, request) {
        // Update rate limit counters
        const rateLimitKey = `rate_limit:${model.id}:${request.context.tenantId}`;
        const estimatedTokens = this.estimateTokenUsage(request.query, request.context.expectedOutputLength);
        await this.redis
            .multi()
            .hincrby(rateLimitKey, 'requests', 1)
            .hincrby(rateLimitKey, 'tokens', estimatedTokens)
            .expire(rateLimitKey, 60) // 1 minute window
            .exec();
    }
    // Load methods
    async loadPremiumModels() {
        // Load from configuration and database
        const premiumModels = [
            {
                id: 'gpt-4-turbo',
                name: 'GPT-4 Turbo',
                provider: 'openai',
                modelType: 'chat',
                tier: 'premium',
                capabilities: ['reasoning', 'code', 'analysis', 'creative'],
                costPerToken: 0.00003,
                maxTokens: 4096,
                contextWindow: 128000,
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                qualityScore: 92,
                speedScore: 85,
                reliabilityScore: 95,
                specializations: ['code', 'reasoning', 'analysis'],
                rateLimits: {
                    requestsPerMinute: 500,
                    tokensPerMinute: 150000,
                    concurrent: 20,
                },
            },
            {
                id: 'claude-3-sonnet',
                name: 'Claude 3 Sonnet',
                provider: 'anthropic',
                modelType: 'chat',
                tier: 'premium',
                capabilities: ['reasoning', 'analysis', 'creative', 'code'],
                costPerToken: 0.000015,
                maxTokens: 4096,
                contextWindow: 200000,
                apiEndpoint: 'https://api.anthropic.com/v1/messages',
                qualityScore: 94,
                speedScore: 88,
                reliabilityScore: 96,
                specializations: ['analysis', 'reasoning', 'research'],
                rateLimits: {
                    requestsPerMinute: 1000,
                    tokensPerMinute: 200000,
                    concurrent: 25,
                },
            },
            // Add more premium models...
        ];
        for (const model of premiumModels) {
            this.availableModels.set(model.id, model);
        }
        logger_js_1.default.info(`Loaded ${premiumModels.length} premium models`);
    }
    async loadPerformanceData() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT model_id, task_type, success_rate, avg_latency, avg_cost, 
               quality_score, last_updated, sample_size
        FROM model_performance 
        WHERE last_updated > NOW() - INTERVAL '30 days'
      `);
            for (const row of result.rows) {
                const key = `${row.model_id}:${row.task_type}`;
                this.performanceData.set(key, {
                    modelId: row.model_id,
                    taskType: row.task_type,
                    successRate: parseFloat(row.success_rate),
                    avgLatency: parseFloat(row.avg_latency),
                    avgCost: parseFloat(row.avg_cost),
                    qualityScore: parseFloat(row.quality_score),
                    lastUpdated: row.last_updated,
                    sampleSize: parseInt(row.sample_size),
                });
            }
            logger_js_1.default.info(`Loaded performance data for ${result.rows.length} model-task combinations`);
        }
        finally {
            client.release();
        }
    }
    async initializeLoadBalancers() {
        for (const [modelId, model] of this.availableModels) {
            this.loadBalancers.set(modelId, new ModelLoadBalancer(model.rateLimits.concurrent));
        }
    }
    async savePerformanceData(performance) {
        const client = await this.pool.connect();
        try {
            await client.query(`
        INSERT INTO model_performance (
          model_id, task_type, success_rate, avg_latency, avg_cost, 
          quality_score, last_updated, sample_size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (model_id, task_type) 
        DO UPDATE SET 
          success_rate = $3, avg_latency = $4, avg_cost = $5,
          quality_score = $6, last_updated = $7, sample_size = $8
      `, [
                performance.modelId,
                performance.taskType,
                performance.successRate,
                performance.avgLatency,
                performance.avgCost,
                performance.qualityScore,
                performance.lastUpdated,
                performance.sampleSize,
            ]);
        }
        finally {
            client.release();
        }
    }
}
exports.PremiumModelRouter = PremiumModelRouter;
class ModelLoadBalancer {
    activeRequests = 0;
    maxConcurrent;
    constructor(maxConcurrent) {
        this.maxConcurrent = maxConcurrent;
    }
    canAcceptRequest() {
        return this.activeRequests < this.maxConcurrent;
    }
    recordStart() {
        this.activeRequests++;
    }
    recordCompletion(success) {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
    }
    getCurrentLoad() {
        return this.activeRequests / this.maxConcurrent;
    }
}
