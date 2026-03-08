"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalPolicyEngine = exports.UncertaintyPolicyEngine = exports.HighAleatoricLowEpistemicRule = exports.LowEvidenceReviewRule = exports.HighRiskEpistemicDebateRule = void 0;
class HighRiskEpistemicDebateRule {
    evaluate(context, records) {
        const task_risk = context.task_risk || 'low';
        if (task_risk === 'high') {
            for (const record of records) {
                if (record.scores.epistemic_score > 0.7) {
                    return {
                        action_type: 'add_step',
                        target: 'multi_agent_debate',
                        parameters: {
                            re_check: 'DiverseAgentEntropy',
                            record_id: record.id,
                        },
                    };
                }
            }
        }
        return null;
    }
}
exports.HighRiskEpistemicDebateRule = HighRiskEpistemicDebateRule;
class LowEvidenceReviewRule {
    evaluate(context, records) {
        for (const record of records) {
            if (record.scores.epistemic_score > 0.6 && record.scores.evidence_coverage < 0.3) {
                record.state = 'Escalated';
                return {
                    action_type: 'block_and_route',
                    target: 'human_review_queue',
                    parameters: {
                        reason: 'Low evidence coverage with high epistemic uncertainty',
                        record_id: record.id,
                    },
                };
            }
        }
        return null;
    }
}
exports.LowEvidenceReviewRule = LowEvidenceReviewRule;
class HighAleatoricLowEpistemicRule {
    evaluate(context, records) {
        for (const record of records) {
            if (record.scores.aleatoric_score > 0.8 && record.scores.epistemic_score < 0.4) {
                return {
                    action_type: 'adjust_sampling',
                    target: 'temperature',
                    parameters: {
                        value: 0.1,
                        fallback: 'reuse_best_prior_trajectory',
                        record_id: record.id,
                    },
                };
            }
        }
        return null;
    }
}
exports.HighAleatoricLowEpistemicRule = HighAleatoricLowEpistemicRule;
class UncertaintyPolicyEngine {
    rules;
    constructor(rules) {
        this.rules = rules || [
            new HighRiskEpistemicDebateRule(),
            new LowEvidenceReviewRule(),
            new HighAleatoricLowEpistemicRule(),
        ];
    }
    evaluatePlan(taskMetadata, records) {
        const actions = [];
        for (const rule of this.rules) {
            const action = rule.evaluate(taskMetadata, records);
            if (action) {
                actions.push(action);
            }
        }
        return actions;
    }
}
exports.UncertaintyPolicyEngine = UncertaintyPolicyEngine;
exports.globalPolicyEngine = new UncertaintyPolicyEngine();
