"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeConfig = exports.defaultPolicyConfig = void 0;
const buildPolicy = (policy) => ({
    ...policy,
    obligations: policy.obligations ? [...policy.obligations] : undefined,
    transforms: policy.transforms ? [...policy.transforms] : undefined,
    redactFields: policy.redactFields ? [...policy.redactFields] : undefined,
});
exports.defaultPolicyConfig = {
    intentPolicies: {
        analytics: buildPolicy({
            action: 'allow',
            policyId: 'policy-analytics-allow',
            rationale: 'Analytics queries are permitted with routine monitoring.',
            obligations: ['log_usage'],
        }),
        marketing: buildPolicy({
            action: 'transform',
            policyId: 'policy-marketing-transform',
            rationale: 'Marketing queries require anonymization prior to sharing.',
            transforms: ['mask_personal_data', 'aggregate_segments'],
            obligations: ['record_transform'],
        }),
        support: buildPolicy({
            action: 'allow',
            policyId: 'policy-support-allow',
            rationale: 'Support interactions are allowed with ticket logging.',
            obligations: ['attach_case_id'],
        }),
        fraud: buildPolicy({
            action: 'redact',
            policyId: 'policy-fraud-redact',
            rationale: 'Fraud investigations must redact customer PII before routing.',
            obligations: ['notify_fraud_team'],
            redactFields: ['account_number', 'ssn', 'routing_number'],
        }),
        research: buildPolicy({
            action: 'transform',
            policyId: 'policy-research-transform',
            rationale: 'Research queries require de-identification and usage tracking.',
            transforms: ['pseudonymize_entities'],
            obligations: ['record_data_use'],
        }),
        unknown: buildPolicy({
            action: 'redact',
            policyId: 'policy-unknown-redact',
            rationale: 'Unclassified queries default to redaction pending manual review.',
            obligations: ['manual_review'],
        }),
    },
    defaultPolicy: buildPolicy({
        action: 'redact',
        policyId: 'policy-default-redact',
        rationale: 'Fallback policy to redact when mapping is unavailable.',
        obligations: ['manual_review'],
    }),
    thresholds: {
        rulePriorityConfidence: 0.82,
        minimumConfidence: 0.55,
        lowConfidencePolicy: buildPolicy({
            action: 'redact',
            policyId: 'policy-low-confidence',
            rationale: 'Classifier confidence was below threshold; apply redaction.',
            obligations: ['escalate_for_review'],
        }),
    },
    cacheSize: 1000,
    modelWeights: {},
};
const mergeConfig = (base, options = {}, modelWeights) => {
    const intentPolicies = {
        ...base.intentPolicies,
        ...Object.fromEntries(Object.entries(options.intentPolicies ?? {}).map(([intent, policy]) => [
            intent,
            buildPolicy(policy),
        ])),
    };
    const mergedThresholds = {
        ...base.thresholds,
        ...options.thresholds,
    };
    const mergedModelWeights = {
        ...modelWeights,
    };
    if (options.modelWeights) {
        Object.keys(options.modelWeights).forEach((intent) => {
            const existing = mergedModelWeights[intent];
            const override = options.modelWeights?.[intent];
            if (!override) {
                return;
            }
            mergedModelWeights[intent] = {
                bias: override.bias ?? existing.bias,
                tokens: {
                    ...existing.tokens,
                    ...(override.tokens ?? {}),
                },
            };
        });
    }
    return {
        intentPolicies,
        defaultPolicy: options.defaultPolicy ? buildPolicy(options.defaultPolicy) : base.defaultPolicy,
        thresholds: mergedThresholds,
        cacheSize: options.cacheSize ?? base.cacheSize,
        modelWeights: mergedModelWeights,
    };
};
exports.mergeConfig = mergeConfig;
