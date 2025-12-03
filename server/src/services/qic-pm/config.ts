import type {
  PolicyDecision,
  QueryIntent,
} from './types.js';
import type { ModelWeights } from './lightweight-model.js';

export interface ThresholdConfig {
  rulePriorityConfidence: number;
  minimumConfidence: number;
  lowConfidencePolicy: PolicyDecision;
}

export interface QueryIntentPolicyConfig {
  intentPolicies: Record<QueryIntent, PolicyDecision> & { unknown: PolicyDecision };
  defaultPolicy: PolicyDecision;
  thresholds: ThresholdConfig;
  cacheSize: number;
  modelWeights: Record<QueryIntent, ModelWeights>;
}

export type QueryIntentPolicyConfigOptions = {
  intentPolicies?: Partial<Record<QueryIntent, PolicyDecision> & { unknown: PolicyDecision }>;
  defaultPolicy?: PolicyDecision;
  thresholds?: Partial<ThresholdConfig>;
  cacheSize?: number;
  modelWeights?: Partial<Record<QueryIntent, Partial<ModelWeights>>>;
};

const buildPolicy = (policy: PolicyDecision): PolicyDecision => ({
  ...policy,
  obligations: policy.obligations ? [...policy.obligations] : undefined,
  transforms: policy.transforms ? [...policy.transforms] : undefined,
  redactFields: policy.redactFields ? [...policy.redactFields] : undefined,
});

export const defaultPolicyConfig: QueryIntentPolicyConfig = {
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
  modelWeights: {} as Record<QueryIntent, ModelWeights>,
};

export const mergeConfig = (
  base: QueryIntentPolicyConfig,
  options: QueryIntentPolicyConfigOptions = {},
  modelWeights: Record<QueryIntent, ModelWeights>,
): QueryIntentPolicyConfig => {
  const intentPolicies: QueryIntentPolicyConfig['intentPolicies'] = {
    ...base.intentPolicies,
    ...Object.fromEntries(
      Object.entries(options.intentPolicies ?? {}).map(([intent, policy]) => [
        intent as QueryIntent,
        buildPolicy(policy as PolicyDecision),
      ]),
    ),
  } as QueryIntentPolicyConfig['intentPolicies'];

  const mergedThresholds: ThresholdConfig = {
    ...base.thresholds,
    ...options.thresholds,
  };

  const mergedModelWeights: Record<QueryIntent, ModelWeights> = {
    ...modelWeights,
  };

  if (options.modelWeights) {
    (Object.keys(options.modelWeights) as QueryIntent[]).forEach((intent) => {
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
