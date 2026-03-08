"use strict";
// Router v2: Adaptive Expert Selection with Online Learning
// Integrates bandit algorithms with production routing logic
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptiveExpertRouter = exports.defaultRouterConfig = exports.AdaptiveExpertRouter = void 0;
const events_1 = require("events");
const bandit_js_1 = require("../learn/bandit.js");
const prometheus_js_1 = require("../observability/prometheus.js");
const circuit_breaker_js_1 = require("../resilience/circuit-breaker.js");
/**
 * Advanced Router v2 with Online Learning
 */
class AdaptiveExpertRouter extends events_1.EventEmitter {
    config;
    expertCapabilities = new Map();
    routingHistory = new Map();
    performanceMetrics = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.initializeExpertCapabilities();
        this.startMetricsCollection();
    }
    /**
     * Route query to best expert using learning + heuristics
     */
    async route(query) {
        const startTime = Date.now();
        const routingStartTime = performance.now();
        try {
            // Extract routing context
            const banditContext = this.extractBanditContext(query);
            // Get token estimate
            const tokenEstimate = this.estimateTokens(query.query);
            banditContext.tokenEst = tokenEstimate;
            let selectedExpert;
            let confidence;
            let routingReason;
            let decisionId;
            let shadowDecision;
            // Determine routing strategy
            if (this.shouldUseLearning(query, banditContext)) {
                // Use learning-based routing
                const learningDecision = await bandit_js_1.adaptiveRouter.route(banditContext, query.query);
                selectedExpert = learningDecision.selectedArm;
                confidence = learningDecision.confidence;
                decisionId = learningDecision.decisionId;
                routingReason = `Learning: ${learningDecision.explorationReason}`;
                // Shadow mode: also get production decision for comparison
                if (this.config.learningMode === 'shadow') {
                    const productionExpert = this.getProductionExpert(query, banditContext);
                    shadowDecision = {
                        arm: productionExpert.expert,
                        confidence: productionExpert.confidence,
                    };
                    // Actually use production expert, but track learning decision
                    if (Math.random() > this.config.canaryPercent / 100) {
                        selectedExpert = productionExpert.expert;
                        confidence = productionExpert.confidence;
                        routingReason = `Production (shadowing ${learningDecision.selectedArm})`;
                    }
                }
            }
            else {
                // Use production heuristics
                const productionDecision = this.getProductionExpert(query, banditContext);
                selectedExpert = productionDecision.expert;
                confidence = productionDecision.confidence;
                decisionId = `heuristic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                routingReason = productionDecision.reason;
            }
            // Apply safety checks and fallbacks
            const finalExpert = await this.applySafetyChecks(selectedExpert, query, banditContext);
            if (finalExpert !== selectedExpert) {
                routingReason += ` (safety fallback to ${finalExpert})`;
                selectedExpert = finalExpert;
                confidence *= 0.7; // Reduce confidence for fallbacks
            }
            // Calculate estimates
            const capability = this.expertCapabilities.get(selectedExpert);
            const estimatedCost = this.calculateCost(selectedExpert, tokenEstimate);
            const estimatedLatency = this.calculateLatency(selectedExpert, tokenEstimate, query.context);
            const routingDecisionTime = performance.now() - routingStartTime;
            const response = {
                queryId: query.id,
                selectedExpert,
                decisionId,
                confidence,
                estimatedCost,
                estimatedLatency,
                routingReason,
                fallbackChain: this.generateFallbackChain(selectedExpert, banditContext),
                shadowDecision,
                timing: {
                    routingDecisionTime: Math.round(routingDecisionTime * 100) / 100,
                    totalProcessingTime: Date.now() - startTime,
                },
            };
            // Store routing history
            this.routingHistory.set(query.id, response);
            // Record metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent(`router_v2_selected_${selectedExpert}`, { success: true });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_v2_decision_time', routingDecisionTime);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_v2_confidence', confidence);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_v2_estimated_cost', estimatedCost);
            // Emit routing event
            this.emit('route:decision', { query, response, context: banditContext });
            return response;
        }
        catch (error) {
            console.error('Routing error:', error);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('router_v2_error', { success: false });
            // Fallback to safe default
            return this.createFallbackResponse(query, error.message, startTime);
        }
    }
    /**
     * Process routing outcome for learning
     */
    async processOutcome(queryId, outcome) {
        const routingResponse = this.routingHistory.get(queryId);
        if (!routingResponse) {
            console.warn(`No routing history found for query: ${queryId}`);
            return;
        }
        // Calculate reward value
        let rewardValue = outcome.success ? 0.7 : 0.2; // Base reward
        // Adjust for performance
        if (outcome.latency < routingResponse.estimatedLatency * 0.8) {
            rewardValue += 0.1; // Bonus for beating latency estimate
        }
        else if (outcome.latency > routingResponse.estimatedLatency * 1.5) {
            rewardValue -= 0.1; // Penalty for slow response
        }
        if (outcome.cost < routingResponse.estimatedCost * 0.9) {
            rewardValue += 0.1; // Bonus for cost efficiency
        }
        else if (outcome.cost > routingResponse.estimatedCost * 1.2) {
            rewardValue -= 0.1; // Penalty for cost overrun
        }
        // Factor in user satisfaction
        if (outcome.userSatisfaction !== undefined) {
            rewardValue = rewardValue * 0.7 + outcome.userSatisfaction * 0.3;
        }
        // Quality adjustment
        if (outcome.quality !== undefined) {
            rewardValue = rewardValue * 0.8 + outcome.quality * 0.2;
        }
        // Ensure reward is in [0,1] range
        rewardValue = Math.max(0, Math.min(1, rewardValue));
        // Submit reward to learning system
        if (this.config.enableLearning) {
            await bandit_js_1.adaptiveRouter.processReward({
                armId: routingResponse.selectedExpert,
                contextHash: routingResponse.decisionId,
                rewardValue,
                rewardType: outcome.success ? 'accepted_insight' : 'incident_free',
                timestamp: Date.now(),
                metadata: {
                    latency: outcome.latency,
                    cost: outcome.cost,
                    userSatisfaction: outcome.userSatisfaction,
                },
            });
        }
        // Update performance metrics
        this.updatePerformanceMetrics(routingResponse.selectedExpert, outcome);
        // Emit outcome event
        this.emit('route:outcome', {
            queryId,
            outcome,
            response: routingResponse,
            rewardValue,
        });
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('router_v2_outcome', { success: outcome.success });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_v2_actual_latency', outcome.latency);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_v2_actual_cost', outcome.cost);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_v2_reward_value', rewardValue);
    }
    /**
     * Get routing performance analytics
     */
    getPerformanceAnalytics() {
        const expertPerformance = {};
        for (const [expert, metrics] of this.performanceMetrics) {
            expertPerformance[expert] = {
                successRate: metrics.successRate,
                averageLatency: metrics.averageLatency,
                averageCost: metrics.averageCost,
                recentFailures: metrics.recentFailures,
                reliability: this.expertCapabilities.get(expert)?.reliability || 0,
            };
        }
        return {
            expertPerformance,
            routingAccuracy: this.calculateRoutingAccuracy(),
            costEfficiency: this.calculateCostEfficiency(),
            latencyAccuracy: this.calculateLatencyAccuracy(),
            learningMetrics: bandit_js_1.adaptiveRouter.getPerformanceMetrics(),
        };
    }
    extractBanditContext(query) {
        return {
            domain: this.inferDomain(query.query, query.context.domain),
            sensitivity: query.context.sensitivity || 'internal',
            tokenEst: 0, // Will be filled later
            tenant: query.context.tenant,
            userId: query.context.userId,
            timeOfDay: this.getTimeOfDay(),
            queryComplexity: this.assessComplexity(query.query),
            urgency: query.context.urgency || 'medium',
        };
    }
    shouldUseLearning(query, context) {
        if (!this.config.enableLearning) {
            return false;
        }
        // Safety-first mode: don't learn on critical queries
        if (this.config.safetyFirst &&
            (context.sensitivity === 'secret' || context.urgency === 'high')) {
            return false;
        }
        // Tenant isolation: check if tenant is in no-learn list
        if (this.config.tenantIsolation && this.isNoLearnTenant(context.tenant)) {
            return false;
        }
        // Learning mode gates
        switch (this.config.learningMode) {
            case 'shadow':
                return true; // Always use learning in shadow mode
            case 'canary':
                return Math.random() < this.config.canaryPercent / 100;
            case 'full':
                return true;
            default:
                return false;
        }
    }
    getProductionExpert(query, context) {
        // Production heuristics (the "old" routing logic)
        // Domain-based routing
        if (context.domain === 'graph') {
            return {
                expert: 'GRAPH_TOOL',
                confidence: 0.9,
                reason: 'Domain: graph operations',
            };
        }
        if (context.domain === 'files') {
            return {
                expert: 'FILES_TOOL',
                confidence: 0.9,
                reason: 'Domain: file operations',
            };
        }
        if (context.domain === 'osint') {
            return {
                expert: 'OSINT_TOOL',
                confidence: 0.85,
                reason: 'Domain: OSINT analysis',
            };
        }
        if (context.domain === 'export') {
            return {
                expert: 'EXPORT_TOOL',
                confidence: 0.9,
                reason: 'Domain: export operations',
            };
        }
        if (context.domain === 'rag') {
            return {
                expert: 'RAG_TOOL',
                confidence: 0.85,
                reason: 'Domain: RAG retrieval',
            };
        }
        // Token-based routing for LLM selection
        if (context.tokenEst > 5000 || context.queryComplexity === 'complex') {
            return {
                expert: 'LLM_HEAVY',
                confidence: 0.8,
                reason: 'High token count/complexity',
            };
        }
        // Default to light LLM
        return {
            expert: 'LLM_LIGHT',
            confidence: 0.7,
            reason: 'Default: general query',
        };
    }
    async applySafetyChecks(selectedExpert, query, context) {
        // Check circuit breaker status
        const resilienceStatus = circuit_breaker_js_1.conductorResilienceManager.getResilienceStatus();
        const expertStatus = resilienceStatus.circuitBreakers[selectedExpert];
        if (expertStatus?.state === 'OPEN') {
            console.warn(`Circuit breaker OPEN for ${selectedExpert}, falling back`);
            return this.selectFallbackExpert(selectedExpert, context);
        }
        // Check expert capacity
        const capability = this.expertCapabilities.get(selectedExpert);
        if (capability && capability.currentLoad >= capability.maxConcurrency) {
            console.warn(`${selectedExpert} at capacity, falling back`);
            return this.selectFallbackExpert(selectedExpert, context);
        }
        // Check cost constraints
        if (query.context.maxCost) {
            const estimatedCost = this.calculateCost(selectedExpert, context.tokenEst);
            if (estimatedCost > query.context.maxCost) {
                console.warn(`${selectedExpert} exceeds cost limit, falling back`);
                return this.selectFallbackExpert(selectedExpert, context);
            }
        }
        return selectedExpert;
    }
    selectFallbackExpert(originalExpert, context) {
        const fallbackChain = this.generateFallbackChain(originalExpert, context);
        for (const fallback of fallbackChain) {
            const capability = this.expertCapabilities.get(fallback);
            const resilienceStatus = circuit_breaker_js_1.conductorResilienceManager.getResilienceStatus();
            const expertStatus = resilienceStatus.circuitBreakers[fallback];
            if (expertStatus?.state !== 'OPEN' &&
                capability &&
                capability.currentLoad < capability.maxConcurrency) {
                return fallback;
            }
        }
        // Last resort fallback
        return 'LLM_LIGHT';
    }
    generateFallbackChain(expert, context) {
        const fallbacks = [];
        switch (expert) {
            case 'LLM_HEAVY':
                fallbacks.push('LLM_LIGHT');
                break;
            case 'LLM_LIGHT':
                fallbacks.push('LLM_HEAVY');
                break;
            case 'GRAPH_TOOL':
                fallbacks.push('LLM_HEAVY', 'LLM_LIGHT');
                break;
            case 'RAG_TOOL':
                fallbacks.push('LLM_HEAVY', 'LLM_LIGHT');
                break;
            case 'FILES_TOOL':
                fallbacks.push('LLM_LIGHT');
                break;
            case 'OSINT_TOOL':
                fallbacks.push('LLM_HEAVY', 'LLM_LIGHT');
                break;
            case 'EXPORT_TOOL':
                fallbacks.push('LLM_LIGHT');
                break;
        }
        // Remove duplicates and ensure fallback is different from original
        return Array.from(new Set(fallbacks)).filter((f) => f !== expert);
    }
    createFallbackResponse(query, error, startTime) {
        return {
            queryId: query.id,
            selectedExpert: 'LLM_LIGHT', // Safe fallback
            decisionId: `fallback_${Date.now()}`,
            confidence: 0.3,
            estimatedCost: 0.001,
            estimatedLatency: 2000,
            routingReason: `Fallback due to error: ${error}`,
            fallbackChain: [],
            timing: {
                routingDecisionTime: 1,
                totalProcessingTime: Date.now() - startTime,
            },
        };
    }
    initializeExpertCapabilities() {
        // Initialize expert capabilities with realistic values
        this.expertCapabilities.set('LLM_LIGHT', {
            arm: 'LLM_LIGHT',
            costPerToken: 0.00001,
            averageLatency: 800,
            maxTokens: 4000,
            domains: ['general', 'simple'],
            sensitivityLevels: ['public', 'internal'],
            reliability: 0.95,
            currentLoad: 0,
            maxConcurrency: 50,
        });
        this.expertCapabilities.set('LLM_HEAVY', {
            arm: 'LLM_HEAVY',
            costPerToken: 0.0001,
            averageLatency: 3000,
            maxTokens: 32000,
            domains: ['general', 'complex', 'analysis'],
            sensitivityLevels: ['public', 'internal', 'confidential', 'secret'],
            reliability: 0.92,
            currentLoad: 0,
            maxConcurrency: 10,
        });
        this.expertCapabilities.set('GRAPH_TOOL', {
            arm: 'GRAPH_TOOL',
            costPerToken: 0.00005,
            averageLatency: 1500,
            maxTokens: 8000,
            domains: ['graph', 'relationships', 'network'],
            sensitivityLevels: ['public', 'internal', 'confidential'],
            reliability: 0.9,
            currentLoad: 0,
            maxConcurrency: 20,
        });
        this.expertCapabilities.set('RAG_TOOL', {
            arm: 'RAG_TOOL',
            costPerToken: 0.00003,
            averageLatency: 1200,
            maxTokens: 6000,
            domains: ['rag', 'search', 'retrieval'],
            sensitivityLevels: ['public', 'internal'],
            reliability: 0.88,
            currentLoad: 0,
            maxConcurrency: 25,
        });
        this.expertCapabilities.set('FILES_TOOL', {
            arm: 'FILES_TOOL',
            costPerToken: 0.00002,
            averageLatency: 500,
            maxTokens: 2000,
            domains: ['files', 'documents', 'storage'],
            sensitivityLevels: ['public', 'internal', 'confidential'],
            reliability: 0.96,
            currentLoad: 0,
            maxConcurrency: 40,
        });
        this.expertCapabilities.set('OSINT_TOOL', {
            arm: 'OSINT_TOOL',
            costPerToken: 0.00008,
            averageLatency: 5000,
            maxTokens: 10000,
            domains: ['osint', 'intelligence', 'investigation'],
            sensitivityLevels: ['public', 'internal', 'confidential', 'secret'],
            reliability: 0.85,
            currentLoad: 0,
            maxConcurrency: 5,
        });
        this.expertCapabilities.set('EXPORT_TOOL', {
            arm: 'EXPORT_TOOL',
            costPerToken: 0.00001,
            averageLatency: 1000,
            maxTokens: 1000,
            domains: ['export', 'format', 'output'],
            sensitivityLevels: ['public', 'internal'],
            reliability: 0.94,
            currentLoad: 0,
            maxConcurrency: 30,
        });
        // Initialize performance metrics
        for (const expert of this.expertCapabilities.keys()) {
            this.performanceMetrics.set(expert, {
                successRate: 0.85, // Start with reasonable baseline
                averageLatency: this.expertCapabilities.get(expert).averageLatency,
                averageCost: 0.001,
                recentFailures: 0,
            });
        }
    }
    estimateTokens(query) {
        // Simple token estimation (4 chars ≈ 1 token)
        return Math.ceil(query.length / 4);
    }
    calculateCost(expert, tokens) {
        const capability = this.expertCapabilities.get(expert);
        return capability ? capability.costPerToken * tokens : 0.001;
    }
    calculateLatency(expert, tokens, context) {
        const capability = this.expertCapabilities.get(expert);
        if (!capability)
            return 2000;
        // Base latency + token processing time
        let latency = capability.averageLatency + tokens * 2; // 2ms per token
        // Urgency adjustment
        if (context.urgency === 'high') {
            latency *= 0.8; // Faster processing for urgent requests
        }
        return Math.round(latency);
    }
    inferDomain(query, providedDomain) {
        if (providedDomain)
            return providedDomain;
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('graph') ||
            lowerQuery.includes('relationship') ||
            lowerQuery.includes('network')) {
            return 'graph';
        }
        if (lowerQuery.includes('file') ||
            lowerQuery.includes('document') ||
            lowerQuery.includes('upload')) {
            return 'files';
        }
        if (lowerQuery.includes('search') ||
            lowerQuery.includes('find') ||
            lowerQuery.includes('retrieve')) {
            return 'rag';
        }
        if (lowerQuery.includes('intelligence') ||
            lowerQuery.includes('osint') ||
            lowerQuery.includes('investigate')) {
            return 'osint';
        }
        if (lowerQuery.includes('export') ||
            lowerQuery.includes('download') ||
            lowerQuery.includes('format')) {
            return 'export';
        }
        return 'general';
    }
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12)
            return 'morning';
        if (hour >= 12 && hour < 17)
            return 'afternoon';
        if (hour >= 17 && hour < 22)
            return 'evening';
        return 'night';
    }
    assessComplexity(query) {
        if (query.length < 50)
            return 'simple';
        if (query.length < 200)
            return 'medium';
        return 'complex';
    }
    isNoLearnTenant(tenant) {
        // Check OPA policy or configuration for no-learn tenants
        const noLearnTenants = process.env.NO_LEARN_TENANTS?.split(',') || [];
        return noLearnTenants.includes(tenant);
    }
    updatePerformanceMetrics(expert, outcome) {
        const metrics = this.performanceMetrics.get(expert);
        if (!metrics)
            return;
        // Update success rate (exponential moving average)
        const alpha = 0.1;
        metrics.successRate =
            (1 - alpha) * metrics.successRate + alpha * (outcome.success ? 1 : 0);
        // Update latency
        if (outcome.latency) {
            metrics.averageLatency =
                (1 - alpha) * metrics.averageLatency + alpha * outcome.latency;
        }
        // Update cost
        if (outcome.cost) {
            metrics.averageCost =
                (1 - alpha) * metrics.averageCost + alpha * outcome.cost;
        }
        // Update failure streak
        if (outcome.success) {
            metrics.recentFailures = 0;
        }
        else {
            metrics.recentFailures += 1;
        }
    }
    calculateRoutingAccuracy() {
        // P2-1: Basic implementation using expert success rates
        let totalRequests = 0;
        let successfulRequests = 0;
        for (const metrics of this.expertMetrics.values()) {
            totalRequests += metrics.successCount + metrics.failureCount;
            successfulRequests += metrics.successCount;
        }
        if (totalRequests === 0)
            return 0.85; // Default for no history
        return successfulRequests / totalRequests;
    }
    calculateCostEfficiency() {
        // P2-1: Cost efficiency = average cost per successful request (inverted & normalized)
        let totalCost = 0;
        let totalSuccesses = 0;
        for (const metrics of this.expertMetrics.values()) {
            totalCost += metrics.totalCost;
            totalSuccesses += metrics.successCount;
        }
        if (totalSuccesses === 0)
            return 0.9; // Default
        const avgCost = totalCost / totalSuccesses;
        // Normalize: lower cost = higher efficiency (cap at 1.0)
        return Math.min(1.0, 1.0 / (1.0 + avgCost / 100));
    }
    calculateLatencyAccuracy() {
        // P2-1: Latency accuracy = how close actual latency is to predicted
        let totalPredictions = 0;
        let accuratePredictions = 0;
        for (const metrics of this.expertMetrics.values()) {
            if (metrics.successCount > 0) {
                const avgLatency = metrics.totalLatency / metrics.successCount;
                // If actual latency is within 20% of baseline, consider it accurate
                const baseline = 1000; // 1 second baseline (TODO: use per-expert baseline)
                const withinTolerance = Math.abs(avgLatency - baseline) / baseline < 0.2;
                totalPredictions += metrics.successCount;
                if (withinTolerance) {
                    accuratePredictions += metrics.successCount;
                }
            }
        }
        if (totalPredictions === 0)
            return 0.82; // Default
        return accuratePredictions / totalPredictions;
    }
    startMetricsCollection() {
        setInterval(() => {
            // Update current load metrics (simulate)
            for (const [expert, capability] of this.expertCapabilities) {
                capability.currentLoad = Math.floor(Math.random() * capability.maxConcurrency * 0.7);
            }
            // Record expert metrics
            for (const [expert, metrics] of this.performanceMetrics) {
                prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric(`expert_${expert}_success_rate`, metrics.successRate);
                prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric(`expert_${expert}_avg_latency`, metrics.averageLatency);
                prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric(`expert_${expert}_recent_failures`, metrics.recentFailures);
            }
            // Record router metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('router_v2_total_decisions', this.routingHistory.size);
        }, 30000); // Every 30 seconds
    }
}
exports.AdaptiveExpertRouter = AdaptiveExpertRouter;
// Default router configuration
exports.defaultRouterConfig = {
    enableLearning: process.env.NODE_ENV !== 'production',
    learningMode: 'shadow',
    canaryPercent: 10,
    fallbackEnabled: true,
    costOptimization: true,
    latencyOptimization: true,
    safetyFirst: process.env.NODE_ENV === 'production',
    tenantIsolation: true,
};
// Singleton instance
exports.adaptiveExpertRouter = new AdaptiveExpertRouter(exports.defaultRouterConfig);
