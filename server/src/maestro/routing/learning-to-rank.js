"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.learningToRankRouter = exports.ROUTER_V2_SCHEMA = exports.LearningToRankRouter = void 0;
const postgres_js_1 = require("../../db/postgres.js");
const otel_tracing_js_1 = require("../../middleware/observability/otel-tracing.js");
class LearningToRankRouter {
    models = new Map();
    trainingData = [];
    weights = new Map();
    fairnessTracker = new Map();
    constructor() {
        this.initializeWeights();
        this.loadModels();
        this.loadTrainingData();
    }
    async rankCandidates(features, tenantId) {
        const candidates = Array.from(this.models.values());
        const scoredCandidates = candidates.map((model) => ({
            model,
            score: this.scoreModel(model, features),
            reasoning: this.explainScore(model, features),
        }));
        scoredCandidates.sort((a, b) => b.score - a.score);
        const adjustedScores = await this.applyFairnessAdjustments(scoredCandidates, tenantId, features);
        const fairnessMetrics = await this.calculateFairnessMetrics(tenantId);
        return { candidates: adjustedScores, fairnessMetrics };
    }
    async finalizeSelection(modelId, features, tenantId) {
        this.updateFairnessTracking(modelId, tenantId);
        await this.logDecision(modelId, features, tenantId);
    }
    initializeWeights() {
        // Initial feature weights (will be learned over time)
        this.weights.set('complexity', 0.25);
        this.weights.set('cost', 0.2);
        this.weights.set('latency', 0.2);
        this.weights.set('quality', 0.25);
        this.weights.set('context', 0.1);
    }
    async routeQuery(features, tenantId) {
        const span = otel_tracing_js_1.otelService.createSpan('router.learning_to_rank');
        try {
            const { candidates, fairnessMetrics } = await this.rankCandidates(features, tenantId);
            const selectedCandidate = candidates[0];
            const explanation = this.generateExplanationPanel(selectedCandidate, candidates.slice(0, 3), features);
            // Update fairness tracking
            await this.finalizeSelection(selectedCandidate.model.id, features, tenantId);
            span?.addSpanAttributes({
                'router.selected_model': selectedCandidate.model.name,
                'router.score': selectedCandidate.score,
                'router.fairness_diversity': fairnessMetrics.diversityScore,
                'router.tenant_id': tenantId,
            });
            return {
                selectedModel: selectedCandidate.model,
                score: selectedCandidate.score,
                reasoning: selectedCandidate.reasoning,
                fairnessMetrics,
                explanation,
            };
        }
        catch (error) {
            console.error('Learning-to-rank routing failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    scoreModel(model, features) {
        let score = 0;
        // Complexity-based scoring
        const complexityFit = this.getComplexityFit(model, features.complexity);
        score += (this.weights.get('complexity') || 0) * complexityFit;
        // Cost-based scoring (inverse - lower cost = higher score)
        const estimatedCost = model.costPerToken * features.estimatedTokens;
        const costScore = Math.max(0, 1 - estimatedCost / 10); // Normalize to 0-1
        score +=
            (this.weights.get('cost') || 0) * costScore * features.costSensitivity;
        // Latency-based scoring (inverse - lower latency = higher score)
        const latencyScore = Math.max(0, 1 - model.avgLatencyMs / 5000); // Normalize to 0-1
        score += (this.weights.get('latency') || 0) * latencyScore;
        // Quality-based scoring
        const qualityFit = model.qualityScore * features.qualityRequirement;
        score += (this.weights.get('quality') || 0) * qualityFit;
        // Context window fit
        const contextFit = features.contextLength <= model.contextWindow ? 1 : 0;
        score += (this.weights.get('context') || 0) * contextFit;
        // Domain capability bonus
        const domainBonus = this.getDomainBonus(model, features.domain);
        score += domainBonus * 0.1;
        // Urgency adjustments
        if (features.urgency > 0.8) {
            // Prioritize speed for urgent requests
            score += (latencyScore - costScore) * 0.2;
        }
        return Math.max(0, Math.min(1, score)); // Clamp to 0-1
    }
    getComplexityFit(model, complexity) {
        // Simple heuristic: match model capability to task complexity
        const modelCapability = model.qualityScore; // Assume quality correlates with capability
        if (complexity < 0.3) {
            // Simple tasks: prefer efficient models
            return modelCapability > 0.7 ? 0.6 : 1.0; // Penalty for over-engineering
        }
        else if (complexity > 0.7) {
            // Complex tasks: require high-capability models
            return modelCapability;
        }
        else {
            // Medium complexity: balanced approach
            return 0.8 + modelCapability * 0.2;
        }
    }
    getDomainBonus(model, domains) {
        let bonus = 0;
        for (const domain of domains) {
            if (model.capabilities.includes(domain)) {
                bonus += 0.1;
            }
        }
        return Math.min(bonus, 0.3); // Cap at 30% bonus
    }
    explainScore(model, features) {
        const factors = [];
        if (features.complexity > 0.7 && model.qualityScore > 0.8) {
            factors.push('High-quality model for complex task');
        }
        if (features.costSensitivity > 0.7 && model.costPerToken < 0.001) {
            factors.push('Cost-effective option');
        }
        if (features.urgency > 0.8 && model.avgLatencyMs < 1000) {
            factors.push('Fast response time for urgent request');
        }
        if (features.contextLength > model.contextWindow) {
            factors.push('⚠️ Context window may be insufficient');
        }
        return factors.length > 0
            ? factors.join('; ')
            : 'Balanced selection based on overall fit';
    }
    async applyFairnessAdjustments(scoredCandidates, tenantId, features) {
        // Get recent selection history for this tenant
        const recentSelections = await this.getRecentSelections(tenantId, 100);
        // Calculate provider distribution
        const providerCount = new Map();
        for (const selection of recentSelections) {
            const count = providerCount.get(selection.provider) || 0;
            providerCount.set(selection.provider, count + 1);
        }
        // Apply fairness adjustments
        return scoredCandidates.map((candidate) => {
            const providerSelections = providerCount.get(candidate.model.provider) || 0;
            const overrepresentationRatio = providerSelections / recentSelections.length;
            let adjustedScore = candidate.score;
            // Reduce score for over-represented providers
            if (overrepresentationRatio > 0.6) {
                adjustedScore *= 0.9; // 10% penalty
                candidate.reasoning += '; Fairness adjustment applied';
            }
            // Boost under-represented providers (if quality is reasonable)
            if (overrepresentationRatio < 0.2 && candidate.score > 0.6) {
                adjustedScore *= 1.1; // 10% boost
                candidate.reasoning += '; Diversity bonus applied';
            }
            return { ...candidate, score: adjustedScore };
        });
    }
    async calculateFairnessMetrics(tenantId) {
        const recentSelections = await this.getRecentSelections(tenantId, 100);
        if (recentSelections.length === 0) {
            return {
                diversityScore: 1.0,
                biasScore: 0.0,
                representationScore: 1.0,
                equityWarnings: [],
            };
        }
        // Calculate diversity (Shannon entropy)
        const providerCount = new Map();
        for (const selection of recentSelections) {
            const count = providerCount.get(selection.provider) || 0;
            providerCount.set(selection.provider, count + 1);
        }
        let entropy = 0;
        for (const count of providerCount.values()) {
            const p = count / recentSelections.length;
            entropy -= p * Math.log2(p);
        }
        const maxEntropy = Math.log2(providerCount.size);
        const diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 1.0;
        // Calculate bias score (concentration in single provider)
        const maxProviderShare = Math.max(...providerCount.values()) / recentSelections.length;
        const biasScore = maxProviderShare > 0.8 ? maxProviderShare - 0.8 : 0;
        // Representation score
        const totalProviders = this.getUniqueProviders().length;
        const representedProviders = providerCount.size;
        const representationScore = representedProviders / totalProviders;
        // Generate warnings
        const equityWarnings = [];
        if (biasScore > 0.1) {
            equityWarnings.push(`High bias detected: ${Math.round(maxProviderShare * 100)}% selections from single provider`);
        }
        if (representationScore < 0.5) {
            equityWarnings.push(`Low representation: Only ${representedProviders}/${totalProviders} providers used`);
        }
        return {
            diversityScore,
            biasScore,
            representationScore,
            equityWarnings,
        };
    }
    generateExplanationPanel(selected, alternatives, features) {
        // Decision tree (simplified)
        const decisionTree = [
            {
                condition: `Complexity: ${(features.complexity * 100).toFixed(0)}%`,
                impact: this.weights.get('complexity') || 0,
                explanation: 'Task complexity determines required model capability',
            },
            {
                condition: `Cost sensitivity: ${(features.costSensitivity * 100).toFixed(0)}%`,
                impact: this.weights.get('cost') || 0,
                explanation: 'Cost constraints influence model selection',
            },
            {
                condition: `Quality requirement: ${(features.qualityRequirement * 100).toFixed(0)}%`,
                impact: this.weights.get('quality') || 0,
                explanation: 'Quality needs determine minimum model threshold',
            },
        ];
        // Feature importance
        const featureImportance = [
            {
                feature: 'Model Quality',
                weight: this.weights.get('quality') || 0,
                value: selected.model.qualityScore,
            },
            {
                feature: 'Cost Efficiency',
                weight: this.weights.get('cost') || 0,
                value: 1 - selected.model.costPerToken,
            },
            {
                feature: 'Response Speed',
                weight: this.weights.get('latency') || 0,
                value: 1 - selected.model.avgLatencyMs / 5000,
            },
            {
                feature: 'Task Fit',
                weight: this.weights.get('complexity') || 0,
                value: features.complexity,
            },
        ];
        // Alternatives with tradeoffs
        const alternativeModels = alternatives.slice(1, 3).map((alt) => ({
            model: alt.model.name,
            score: alt.score,
            tradeoffs: this.compareModels(selected.model, alt.model),
        }));
        return {
            decisionTree,
            featureImportance,
            alternatives: alternativeModels,
            policyInfluence: [], // Would be populated by policy engine
        };
    }
    compareModels(selected, alternative) {
        const tradeoffs = [];
        if (alternative.costPerToken < selected.costPerToken) {
            tradeoffs.push(`${Math.round((1 - alternative.costPerToken / selected.costPerToken) * 100)}% cheaper`);
        }
        if (alternative.avgLatencyMs < selected.avgLatencyMs) {
            tradeoffs.push(`${Math.round(selected.avgLatencyMs - alternative.avgLatencyMs)}ms faster`);
        }
        if (alternative.qualityScore > selected.qualityScore) {
            tradeoffs.push(`${Math.round((alternative.qualityScore - selected.qualityScore) * 100)}% higher quality`);
        }
        return tradeoffs.length > 0
            ? tradeoffs.join(', ')
            : 'Similar performance profile';
    }
    updateFairnessTracking(modelId, tenantId) {
        const key = `${tenantId}:${modelId}`;
        const current = this.fairnessTracker.get(key) || 0;
        this.fairnessTracker.set(key, current + 1);
    }
    async logDecision(modelId, features, tenantId) {
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            await pool.query(`INSERT INTO router_decisions_v2 
         (tenant_id, selected_model, features, timestamp)
         VALUES ($1, $2, $3, now())`, [tenantId, modelId, JSON.stringify(features)]);
        }
        catch (error) {
            console.error('Failed to log routing decision:', error);
        }
    }
    async getRecentSelections(tenantId, limit) {
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const { rows } = await pool.query(`SELECT selected_model FROM router_decisions_v2 
         WHERE tenant_id = $1 
         ORDER BY timestamp DESC LIMIT $2`, [tenantId, limit]);
            return rows.map((row) => {
                const model = this.models.get(row.selected_model);
                return {
                    provider: model?.provider || 'unknown',
                    model: row.selected_model,
                };
            });
        }
        catch (error) {
            console.error('Failed to get recent selections:', error);
            return [];
        }
    }
    getUniqueProviders() {
        const providers = new Set();
        for (const model of this.models.values()) {
            providers.add(model.provider);
        }
        return Array.from(providers);
    }
    async loadModels() {
        // Initialize with some example models
        const models = [
            {
                id: 'gpt-4o',
                name: 'GPT-4o',
                provider: 'openai',
                costPerToken: 0.00003,
                avgLatencyMs: 1200,
                qualityScore: 0.95,
                throughput: 1000,
                contextWindow: 128000,
                capabilities: ['reasoning', 'coding', 'analysis', 'writing'],
                lastUpdated: new Date(),
            },
            {
                id: 'claude-3-5-sonnet',
                name: 'Claude 3.5 Sonnet',
                provider: 'anthropic',
                costPerToken: 0.000015,
                avgLatencyMs: 1500,
                qualityScore: 0.93,
                throughput: 800,
                contextWindow: 200000,
                capabilities: ['reasoning', 'analysis', 'writing', 'research'],
                lastUpdated: new Date(),
            },
            {
                id: 'gemini-pro',
                name: 'Gemini Pro',
                provider: 'google',
                costPerToken: 0.0000125,
                avgLatencyMs: 1000,
                qualityScore: 0.88,
                throughput: 1200,
                contextWindow: 32000,
                capabilities: ['reasoning', 'multimodal', 'coding'],
                lastUpdated: new Date(),
            },
        ];
        for (const model of models) {
            this.models.set(model.id, model);
        }
    }
    async loadTrainingData() {
        // In production, this would load from database
        // For now, we'll start with empty training data
        this.trainingData = [];
    }
    async trainFromFeedback(feedback) {
        this.trainingData.push(feedback);
        // Simple weight adjustment based on feedback
        if (feedback.outcome.success && feedback.outcome.userSatisfaction > 0.8) {
            // Reinforce successful decisions
            this.adjustWeights(feedback.features, 1.02); // 2% increase
        }
        else if (!feedback.outcome.success ||
            feedback.outcome.userSatisfaction < 0.5) {
            // Penalize poor decisions
            this.adjustWeights(feedback.features, 0.98); // 2% decrease
        }
        // Persist updated weights
        await this.saveWeights();
    }
    adjustWeights(features, factor) {
        // Adjust weights based on which features were emphasized
        if (features.costSensitivity > 0.7) {
            const current = this.weights.get('cost') || 0;
            this.weights.set('cost', current * factor);
        }
        if (features.qualityRequirement > 0.7) {
            const current = this.weights.get('quality') || 0;
            this.weights.set('quality', current * factor);
        }
        if (features.urgency > 0.7) {
            const current = this.weights.get('latency') || 0;
            this.weights.set('latency', current * factor);
        }
        // Normalize weights to sum to 1
        const total = Array.from(this.weights.values()).reduce((sum, w) => sum + w, 0);
        for (const [key, weight] of this.weights.entries()) {
            this.weights.set(key, weight / total);
        }
    }
    async saveWeights() {
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const weightsJson = JSON.stringify(Object.fromEntries(this.weights));
            await pool.query(`INSERT INTO router_weights (weights, updated_at)
         VALUES ($1, now())
         ON CONFLICT ((SELECT 1)) DO UPDATE SET
         weights = $1, updated_at = now()`, [weightsJson]);
        }
        catch (error) {
            console.error('Failed to save weights:', error);
        }
    }
}
exports.LearningToRankRouter = LearningToRankRouter;
exports.ROUTER_V2_SCHEMA = `
CREATE TABLE IF NOT EXISTS router_decisions_v2 (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  selected_model TEXT NOT NULL,
  features JSONB NOT NULL,
  score DECIMAL(5,4),
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS router_weights (
  id SERIAL PRIMARY KEY,
  weights JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS router_feedback (
  id BIGSERIAL PRIMARY KEY,
  decision_id BIGINT REFERENCES router_decisions_v2(id),
  outcome JSONB NOT NULL,
  user_satisfaction DECIMAL(3,2),
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS router_decisions_v2_tenant_time_idx ON router_decisions_v2 (tenant_id, timestamp DESC);
`;
exports.learningToRankRouter = new LearningToRankRouter();
