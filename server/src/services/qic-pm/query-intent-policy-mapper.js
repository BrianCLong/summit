"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryIntentPolicyMapper = void 0;
const rules_js_1 = require("./rules.js");
const lightweight_model_js_1 = require("./lightweight-model.js");
const config_js_1 = require("./config.js");
const stableStringify = (value) => {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    const entries = Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`);
    return `{${entries.join(',')}}`;
};
const cloneDecision = (decision) => ({
    ...decision,
    obligations: decision.obligations ? [...decision.obligations] : undefined,
    transforms: decision.transforms ? [...decision.transforms] : undefined,
    redactFields: decision.redactFields ? [...decision.redactFields] : undefined,
});
const cloneExplanation = (explanation) => explanation.map((step) => ({
    ...step,
    details: step.details ? { ...step.details } : undefined,
}));
const normalizeQuery = (query) => query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
class QueryIntentPolicyMapper {
    ruleEngine;
    model;
    config;
    cache;
    constructor(options = {}) {
        const config = (0, config_js_1.mergeConfig)(config_js_1.defaultPolicyConfig, options, lightweight_model_js_1.defaultModelWeights);
        this.config = config;
        this.ruleEngine = new rules_js_1.RuleEngine(options.rules ?? rules_js_1.defaultRules);
        this.model = new lightweight_model_js_1.LightweightIntentModel(config.modelWeights);
        this.cache = new Map();
    }
    evaluate(query, context = {}) {
        const sanitizedQuery = normalizeQuery(query ?? '');
        const cacheKey = `${sanitizedQuery}|${stableStringify(context)}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return {
                ...cached,
                decision: cloneDecision(cached.decision),
                explanation: cloneExplanation(cached.explanation),
            };
        }
        const explanationSteps = [];
        let ruleMatch = null;
        if (sanitizedQuery) {
            ruleMatch = this.ruleEngine.evaluate(sanitizedQuery, context);
            if (ruleMatch) {
                explanationSteps.push(ruleMatch.explanation);
            }
        }
        const modelResult = sanitizedQuery
            ? this.model.predict(sanitizedQuery)
            : null;
        if (modelResult) {
            explanationSteps.push(modelResult.explanation);
        }
        let intent = modelResult?.intent ?? ruleMatch?.intent ?? 'unknown';
        let confidence = modelResult?.confidence ?? 0;
        const probabilities = modelResult?.probabilities ?? {
            analytics: 0,
            marketing: 0,
            support: 0,
            fraud: 0,
            research: 0,
            unknown: 1,
        };
        if (ruleMatch && modelResult) {
            const modelSupport = modelResult.probabilities[ruleMatch.intent] ?? 0;
            if (ruleMatch.confidence >= this.config.thresholds.rulePriorityConfidence ||
                modelSupport >= modelResult.confidence) {
                intent = ruleMatch.intent;
                confidence = Math.max(ruleMatch.confidence, modelSupport);
                explanationSteps.push({
                    stage: 'rule',
                    intent,
                    confidence: Number(confidence.toFixed(4)),
                    description: `Rule ${ruleMatch.ruleId} prioritized intent ${intent}.`,
                    details: {
                        ruleId: ruleMatch.ruleId,
                        trigger: ruleMatch.trigger,
                        reason: 'rule-priority',
                    },
                });
            }
            else if (ruleMatch.intent !== modelResult.intent) {
                explanationSteps.push({
                    stage: 'rule',
                    intent: ruleMatch.intent,
                    confidence: ruleMatch.confidence,
                    description: `Rule ${ruleMatch.ruleId} suggested ${ruleMatch.intent} but model favored ${modelResult.intent}.`,
                    details: {
                        ruleId: ruleMatch.ruleId,
                        trigger: ruleMatch.trigger,
                        reason: 'model-overrode-rule',
                    },
                });
            }
        }
        else if (ruleMatch && !modelResult) {
            intent = ruleMatch.intent;
            confidence = ruleMatch.confidence;
        }
        if (!sanitizedQuery) {
            intent = 'unknown';
            confidence = 0;
        }
        let decision = cloneDecision(this.config.intentPolicies[intent] ?? this.config.defaultPolicy);
        let policyReason = 'intent-match';
        if (confidence < this.config.thresholds.minimumConfidence) {
            decision = cloneDecision(this.config.thresholds.lowConfidencePolicy);
            policyReason = 'low-confidence';
        }
        explanationSteps.push({
            stage: 'policy',
            intent,
            confidence: Number(confidence.toFixed(4)),
            description: `Intent ${intent} mapped to ${decision.action} via policy ${decision.policyId}.`,
            details: {
                policyId: decision.policyId,
                rationale: decision.rationale,
                obligations: decision.obligations,
                transforms: decision.transforms,
                reason: policyReason,
            },
        });
        const result = {
            intent,
            confidence,
            probabilities,
            explanation: explanationSteps,
            decision,
        };
        this.cache.set(cacheKey, {
            ...result,
            decision: cloneDecision(result.decision),
            explanation: cloneExplanation(result.explanation),
        });
        if (this.cache.size > this.config.cacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        return result;
    }
}
exports.QueryIntentPolicyMapper = QueryIntentPolicyMapper;
