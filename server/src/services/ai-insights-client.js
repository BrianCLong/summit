"use strict";
// @ts-nocheck
/**
 * AI Insights Client
 *
 * Node.js client for communicating with the AI Insights MVP-0 service
 * Provides entity resolution and link scoring capabilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIInsightsClient = void 0;
exports.getAIInsightsClient = getAIInsightsClient;
exports.validateAIInsightsConnection = validateAIInsightsConnection;
const node_fetch_1 = __importDefault(require("node-fetch"));
const otel_js_1 = require("../otel.js");
class AIInsightsClient {
    config;
    tracer = (0, otel_js_1.getTracer)('ai-insights-client');
    constructor(config = {}) {
        this.config = {
            baseUrl: process.env.AI_INSIGHTS_URL || 'http://insight-ai:8000',
            timeout: 30000, // 30 seconds
            retries: 3,
            featureFlagEnabled: process.env.FEATURE_FLAG_AI_INSIGHTS === 'true',
            ...config,
        };
        console.log('🧠 AI Insights Client initialized:', {
            baseUrl: this.config.baseUrl,
            enabled: this.config.featureFlagEnabled,
        });
    }
    /**
     * Check if AI insights are enabled
     */
    isEnabled() {
        return this.config.featureFlagEnabled;
    }
    /**
     * Resolve similar entities
     */
    async resolveEntities(entities, options = {}) {
        if (!this.isEnabled()) {
            console.log('🚫 AI Insights disabled, returning empty matches');
            return [];
        }
        return this.tracer.startActiveSpan('ai-insights.resolve-entities', async (span) => {
            try {
                span.setAttributes({
                    'ai.service': 'entity-resolution',
                    'ai.entities.count': entities.length,
                    'ai.threshold': options.threshold || 0.8,
                });
                const request = {
                    entities,
                    threshold: options.threshold || 0.8,
                    include_features: options.includeFeatures || false,
                };
                const response = await this.makeRequest('/resolve-entities', request);
                span.setAttributes({
                    'ai.matches.count': response.matches.length,
                    'ai.processing_time_ms': response.processing_time_ms,
                    'ai.model_version': response.model_version,
                });
                console.log(`🎯 Entity resolution: ${response.matches.length} matches found in ${response.processing_time_ms}ms`);
                return response.matches;
            }
            catch (error) {
                span.recordException(error);
                console.error('❌ Entity resolution failed:', error);
                return []; // Fail gracefully
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Score entity relationship links
     */
    async scoreLinks(entityPairs, options = {}) {
        if (!this.isEnabled()) {
            console.log('🚫 AI Insights disabled, returning empty scores');
            return [];
        }
        return this.tracer.startActiveSpan('ai-insights.score-links', async (span) => {
            try {
                span.setAttributes({
                    'ai.service': 'link-scoring',
                    'ai.pairs.count': entityPairs.length,
                });
                const request = {
                    entity_pairs: entityPairs,
                    include_confidence: options.includeConfidence !== false,
                };
                const response = await this.makeRequest('/score-links', request);
                span.setAttributes({
                    'ai.scores.count': response.scores.length,
                    'ai.processing_time_ms': response.processing_time_ms,
                    'ai.model_version': response.model_version,
                });
                console.log(`🔗 Link scoring: ${response.scores.length} scores computed in ${response.processing_time_ms}ms`);
                return response.scores;
            }
            catch (error) {
                span.recordException(error);
                console.error('❌ Link scoring failed:', error);
                return []; // Fail gracefully
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Get AI service health
     */
    async getHealth() {
        try {
            return await this.makeRequest('/health', null, 'GET');
        }
        catch (error) {
            console.error('❌ AI health check failed:', error);
            return null;
        }
    }
    /**
     * Batch entity resolution with automatic chunking
     */
    async batchResolveEntities(entities, batchSize = 50, threshold = 0.8) {
        if (!this.isEnabled()) {
            return [];
        }
        const allMatches = [];
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            const matches = await this.resolveEntities(batch, { threshold });
            allMatches.push(...matches);
        }
        return allMatches;
    }
    /**
     * Calculate AI score for a single entity (for GraphQL integration)
     */
    async calculateEntityScore(entity) {
        if (!this.isEnabled()) {
            return 0.5; // Default neutral score
        }
        try {
            // Create a simple scoring based on entity completeness and type
            let score = 0.3; // Base score
            // Name quality
            if (entity.name && entity.name.length > 2) {
                score += 0.2;
            }
            // Type specificity
            if (entity.type && entity.type !== 'unknown') {
                score += 0.2;
            }
            // Attributes richness
            const attrCount = Object.keys(entity.attributes || {}).length;
            score += Math.min(attrCount * 0.05, 0.3);
            // For MVP, return this simple calculation
            // In future versions, use ML model prediction
            return Math.min(score, 1.0);
        }
        catch (error) {
            console.error('❌ Entity scoring failed:', error);
            return 0.5;
        }
    }
    /**
     * Make HTTP request to AI service
     */
    async makeRequest(endpoint, data, method = 'POST') {
        const url = `${this.config.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'intelgraph-server/1.0',
                },
                signal: controller.signal,
            };
            if (method === 'POST' && data) {
                options.body = JSON.stringify(data);
            }
            const response = await (0, node_fetch_1.default)(url, options);
            if (!response.ok) {
                throw new Error(`AI service responded with ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`AI service request timeout after ${this.config.timeout}ms`);
            }
            throw error;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
exports.AIInsightsClient = AIInsightsClient;
// Singleton instance
let aiInsightsClient = null;
function getAIInsightsClient() {
    if (!aiInsightsClient) {
        aiInsightsClient = new AIInsightsClient();
    }
    return aiInsightsClient;
}
// Health check for application startup
async function validateAIInsightsConnection() {
    const client = getAIInsightsClient();
    if (!client.isEnabled()) {
        console.log('ℹ️  AI Insights is disabled via feature flag');
        return true; // Not an error if disabled
    }
    try {
        const health = await client.getHealth();
        if (health && health.status === 'healthy') {
            console.log('✅ AI Insights service is healthy');
            return true;
        }
        else {
            console.warn('⚠️  AI Insights service is not healthy:', health);
            return false;
        }
    }
    catch (error) {
        console.error('❌ Failed to connect to AI Insights service:', error.message);
        return false;
    }
}
