"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMDecisionRouter = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const decision_recorder_js_1 = require("./decision-recorder.js");
const learning_to_rank_js_1 = require("./learning-to-rank.js");
class LLMDecisionRouter {
    router;
    recorder;
    constructor(router = learning_to_rank_js_1.learningToRankRouter, recorder = new decision_recorder_js_1.DecisionRecorder()) {
        this.router = router;
        this.recorder = recorder;
    }
    async route(request, options = {}) {
        const policies = request.policies || [];
        const constraints = request.constraints || {};
        const { candidates, fairnessMetrics } = await this.router.rankCandidates(request.features, request.tenantId);
        const fallbacks = [];
        const orderedCandidates = this.reorderByPreferredProviders(candidates, constraints.preferredProviders);
        const selectedCandidate = this.selectCandidate(orderedCandidates, constraints, request.features, fallbacks);
        if (!selectedCandidate) {
            throw new Error('No model satisfies provided policy constraints');
        }
        if (options.applySideEffects !== false) {
            await this.router.finalizeSelection(selectedCandidate.model.id, request.features, request.tenantId);
        }
        const estimatedCost = this.estimateCost(selectedCandidate.model, request.features);
        const guardrailActions = { piiRedactions: request.redactions || [] };
        const decisionRecord = {
            decisionId: node_crypto_1.default.randomUUID(),
            timestamp: new Date().toISOString(),
            request: {
                prompt: request.prompt,
                context: request.context || {},
                tenantId: request.tenantId,
                userId: request.userId,
                policies,
                constraints,
                features: request.features,
            },
            outcome: {
                provider: selectedCandidate.model.provider,
                model: selectedCandidate.model.id,
                score: selectedCandidate.score,
                estimatedCost,
                estimatedLatency: selectedCandidate.model.avgLatencyMs,
                fairness: fairnessMetrics,
                guardrailActions,
                fallbacks,
            },
            meta: {
                decisionStartedAt: request.startedAt || new Date().toISOString(),
                decidedAt: new Date().toISOString(),
            },
        };
        if (options.persist !== false) {
            await this.recorder.record(decisionRecord);
        }
        const decision = {
            selectedModel: selectedCandidate.model,
            score: selectedCandidate.score,
            reasoning: selectedCandidate.reasoning,
            fairnessMetrics,
            explanation: {
                decisionTree: [
                    {
                        condition: `Preferred providers applied in order: ${constraints.preferredProviders?.join(', ') || 'none'}`,
                        impact: 1,
                        explanation: 'Policy ordering is honored before constraint evaluation.',
                    },
                ],
                featureImportance: [
                    {
                        feature: 'Estimated cost',
                        weight: 1,
                        value: estimatedCost,
                    },
                    {
                        feature: 'Latency budget',
                        weight: 1,
                        value: selectedCandidate.model.avgLatencyMs,
                    },
                ],
                alternatives: fallbacks.map((fallback) => ({
                    model: fallback.model,
                    score: selectedCandidate.score,
                    tradeoffs: fallback.reason,
                })),
                policyInfluence: policies,
            },
        };
        return { decision, record: decisionRecord };
    }
    selectCandidate(candidates, constraints, features, fallbacks) {
        for (const candidate of candidates) {
            const violation = this.findConstraintViolation(candidate.model, constraints, features);
            if (violation) {
                fallbacks.push({
                    provider: candidate.model.provider,
                    model: candidate.model.id,
                    reason: violation,
                });
                continue;
            }
            return candidate;
        }
        return undefined;
    }
    reorderByPreferredProviders(candidates, preferredProviders) {
        if (!preferredProviders?.length) {
            return candidates;
        }
        const prioritized = new Map();
        const remainder = [];
        for (const candidate of candidates) {
            if (preferredProviders.includes(candidate.model.provider)) {
                const bucket = prioritized.get(candidate.model.provider) || [];
                bucket.push(candidate);
                prioritized.set(candidate.model.provider, bucket);
            }
            else {
                remainder.push(candidate);
            }
        }
        const orderedPriorities = [];
        for (const provider of preferredProviders) {
            const bucket = prioritized.get(provider);
            if (bucket?.length) {
                orderedPriorities.push(...bucket);
            }
        }
        return [...orderedPriorities, ...remainder];
    }
    findConstraintViolation(candidate, constraints, features) {
        if (constraints.allowedProviders?.length &&
            !constraints.allowedProviders.includes(candidate.provider)) {
            return 'provider_blocked_by_policy';
        }
        if (constraints.blockedModels?.includes(candidate.id)) {
            return 'model_blocked_by_policy';
        }
        if (constraints.maxLatencyMs && candidate.avgLatencyMs > constraints.maxLatencyMs) {
            return 'latency_budget_exceeded';
        }
        const estimatedCost = this.estimateCost(candidate, features);
        if (constraints.maxCost && estimatedCost > constraints.maxCost) {
            return 'cost_budget_exceeded';
        }
        return null;
    }
    estimateCost(model, features) {
        return Number((model.costPerToken * features.estimatedTokens).toFixed(6));
    }
}
exports.LLMDecisionRouter = LLMDecisionRouter;
