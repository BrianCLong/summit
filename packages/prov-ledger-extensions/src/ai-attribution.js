"use strict";
/**
 * AI Attribution Tracking
 *
 * Tracks AI/ML model contributions to entity creation and analysis.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAttributionTracker = void 0;
exports.createAIAttributionMiddleware = createAIAttributionMiddleware;
// -----------------------------------------------------------------------------
// Attribution Tracker
// -----------------------------------------------------------------------------
class AIAttributionTracker {
    attributions = [];
    modelCards = new Map();
    /**
     * Record an AI attribution
     */
    async record(attribution) {
        const id = this.generateId();
        const record = {
            ...attribution,
            id,
            timestamp: new Date(),
        };
        this.attributions.push(record);
        return id;
    }
    /**
     * Get attributions for an entity
     */
    getForEntity(entityId) {
        return this.attributions.filter((a) => a.output.entityIds?.includes(entityId));
    }
    /**
     * Get attributions for an investigation
     */
    getForInvestigation(investigationId) {
        return this.attributions.filter((a) => a.investigationId === investigationId);
    }
    /**
     * Get attributions by model
     */
    getByModel(modelId) {
        return this.attributions.filter((a) => a.modelId === modelId);
    }
    /**
     * Get total costs for a tenant
     */
    getTenantCosts(tenantId, startDate, endDate) {
        const filtered = this.attributions.filter((a) => a.tenantId === tenantId &&
            a.timestamp >= startDate &&
            a.timestamp <= endDate);
        const byModel = {};
        let totalCost = 0;
        let totalTokens = 0;
        for (const attr of filtered) {
            const cost = attr.metrics.estimatedCost || 0;
            const tokens = attr.metrics.totalTokens;
            totalCost += cost;
            totalTokens += tokens;
            if (!byModel[attr.modelId]) {
                byModel[attr.modelId] = { cost: 0, tokens: 0 };
            }
            byModel[attr.modelId].cost += cost;
            byModel[attr.modelId].tokens += tokens;
        }
        return { totalCost, totalTokens, byModel };
    }
    /**
     * Register a model card
     */
    registerModelCard(card) {
        this.modelCards.set(card.modelId, card);
    }
    /**
     * Get model card
     */
    getModelCard(modelId) {
        return this.modelCards.get(modelId);
    }
    /**
     * Generate attribution report
     */
    generateReport(options) {
        const filtered = this.attributions.filter((a) => {
            if (a.timestamp < options.startDate || a.timestamp > options.endDate) {
                return false;
            }
            if (options.tenantId && a.tenantId !== options.tenantId) {
                return false;
            }
            if (options.investigationId && a.investigationId !== options.investigationId) {
                return false;
            }
            return true;
        });
        const operationCounts = {};
        const modelUsage = {};
        let totalTokens = 0;
        let totalCost = 0;
        let totalLatency = 0;
        for (const attr of filtered) {
            operationCounts[attr.operationType] = (operationCounts[attr.operationType] || 0) + 1;
            modelUsage[attr.modelId] = (modelUsage[attr.modelId] || 0) + 1;
            totalTokens += attr.metrics.totalTokens;
            totalCost += attr.metrics.estimatedCost || 0;
            totalLatency += attr.metrics.latencyMs;
        }
        return {
            period: { start: options.startDate, end: options.endDate },
            summary: {
                totalOperations: filtered.length,
                totalTokens,
                totalCost,
                averageLatencyMs: filtered.length > 0 ? totalLatency / filtered.length : 0,
                averageConfidence: filtered.length > 0
                    ? filtered.reduce((sum, a) => sum + a.confidence, 0) / filtered.length
                    : 0,
            },
            operationCounts,
            modelUsage,
            attributions: filtered,
        };
    }
    generateId() {
        return `ai_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.AIAttributionTracker = AIAttributionTracker;
// -----------------------------------------------------------------------------
// Attribution Middleware
// -----------------------------------------------------------------------------
/**
 * Create middleware for tracking AI operations
 */
function createAIAttributionMiddleware(tracker) {
    return async function attributionMiddleware(operation, execute) {
        const startTime = Date.now();
        const result = await execute();
        const latencyMs = Date.now() - startTime;
        const attributionId = await tracker.record({
            modelId: operation.modelId,
            modelVersion: operation.modelVersion,
            provider: operation.provider,
            operationType: operation.operationType,
            input: operation.input,
            output: result.output,
            config: operation.config,
            metrics: {
                latencyMs,
                inputTokens: operation.input.tokenCount || 0,
                outputTokens: result.output.tokenCount || 0,
                totalTokens: (operation.input.tokenCount || 0) + (result.output.tokenCount || 0),
                estimatedCost: calculateCost(operation.provider, operation.modelId, operation.input.tokenCount || 0, result.output.tokenCount || 0),
            },
            confidence: result.confidence,
            userId: operation.userId,
            tenantId: operation.tenantId,
            investigationId: operation.investigationId,
            correlationId: operation.correlationId,
        });
        return { attributionId, result };
    };
}
/**
 * Estimate cost based on provider and model
 */
function calculateCost(provider, modelId, inputTokens, outputTokens) {
    // Rough cost estimates per 1K tokens
    const rates = {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
        default: { input: 0.001, output: 0.002 },
    };
    const rate = rates[modelId] || rates.default;
    return (inputTokens * rate.input + outputTokens * rate.output) / 1000;
}
