import { z } from 'zod';
import {
  getMetricsRegistry,
  type MetricDefinition,
  type MetricsRegistry,
} from '@intelgraph/platform-telemetry';

export type PeftAdapterKind =
  | 'lora'
  | 'dora'
  | 'adalora'
  | 'miss'
  | 'pissa'
  | 'milora'
  | 'vera'
  | 'rank1'
  | 'ln_tune_only'
  | 'ia3_only'
  | `svd_init_${string}`
  | string;

export interface RlvrAdapterPolicyConfig {
  rlvrEnabled: boolean;
  adapter?: PeftAdapterKind;
  rank?: number;
  allowUnsafe?: boolean;
  warnOnly?: boolean;
  targetModules?: number;
  estimatedTrainableParams?: number;
}

export type GuardrailRule =
  | 'structural_preferred'
  | 'svd_blocked'
  | 'rank_too_low'
  | 'low_capacity_adapter';

export interface RlvrPolicyDecision {
  allowed: boolean;
  decision: 'ok' | 'warn' | 'error';
  effectiveAdapter: PeftAdapterKind;
  messages: string[];
  issues: GuardrailFinding[];
  rank: number;
  overrideUsed: boolean;
  estimatedTrainableParams?: number;
}

export interface GuardrailFinding {
  rule: GuardrailRule;
  severity: 'warn' | 'error';
  requiresOverride: boolean;
  detail: string;
}

const rlvrConfigSchema = z.object({
  rlvrEnabled: z.boolean().default(false),
  adapter: z.string().optional(),
  rank: z.number().int().positive().default(32),
  allowUnsafe: z.boolean().default(false),
  warnOnly: z.boolean().default(false),
  targetModules: z.number().int().positive().optional(),
  estimatedTrainableParams: z.number().positive().optional(),
});

const STRUCTURAL_DEFAULT: PeftAdapterKind = 'dora';
const MIN_EFFECTIVE_RANK = 8;
const structuralAdapters: PeftAdapterKind[] = ['dora', 'adalora', 'miss'];
const svdInitializedAdapters: PeftAdapterKind[] = ['pissa', 'milora'];
const lowCapacityAdapters: PeftAdapterKind[] = ['vera', 'rank1', 'ln_tune_only', 'ia3_only'];

const decisionMetricDefinition: MetricDefinition = {
  name: 'rlvr_adapter_policy_decisions',
  type: 'counter',
  unit: 'count',
  description: 'RLVR PEFT adapter policy decisions and guardrail outcomes',
  labels: ['adapter', 'decision', 'override_used', 'reason'],
};

let metricsRegistered = false;

function emitDecisionMetric(
  registry: MetricsRegistry,
  decision: RlvrPolicyDecision,
  primaryReason: string
): void {
  if (!metricsRegistered) {
    registry.registerMetric(decisionMetricDefinition);
    metricsRegistered = true;
  }

  registry.inc('rlvr_adapter_policy_decisions', {
    adapter: String(decision.effectiveAdapter),
    decision: decision.decision,
    override_used: String(decision.overrideUsed),
    reason: primaryReason,
  });
}

export function parseRlvrAdapterConfig(
  env: NodeJS.ProcessEnv = process.env
): RlvrAdapterPolicyConfig {
  const parsed = rlvrConfigSchema.parse({
    rlvrEnabled: env.RLVR_ENABLED === 'true',
    adapter: env.RLVR_PEFT_ADAPTER,
    rank: env.RLVR_PEFT_RANK ? Number(env.RLVR_PEFT_RANK) : undefined,
    allowUnsafe: env.RLVR_PEFT_ALLOW_UNSAFE === 'true',
    warnOnly: env.RLVR_PEFT_WARN_ONLY === 'true',
    targetModules: env.RLVR_PEFT_TARGET_MODULES ? Number(env.RLVR_PEFT_TARGET_MODULES) : undefined,
  });

  const effectiveAdapter = parsed.rlvrEnabled
    ? parsed.adapter ?? STRUCTURAL_DEFAULT
    : parsed.adapter ?? 'lora';

  return { ...parsed, adapter: effectiveAdapter };
}

export function evaluateRlvrAdapterPolicy(
  rawConfig: RlvrAdapterPolicyConfig,
  options: { logger?: Console; metricsRegistry?: MetricsRegistry } = {}
): RlvrPolicyDecision {
  const config = rlvrConfigSchema.parse(rawConfig);
  const adapter = rawConfig.adapter ?? (config.rlvrEnabled ? STRUCTURAL_DEFAULT : 'lora');
  const rank = rawConfig.rank ?? config.rank ?? 32;

  const logger = options.logger ?? console;
  const registry = options.metricsRegistry ?? getMetricsRegistry();

  const decision: RlvrPolicyDecision = {
    allowed: true,
    decision: 'ok',
    effectiveAdapter: adapter,
    messages: [],
    issues: [],
    rank,
    overrideUsed: false,
    estimatedTrainableParams:
      rawConfig.estimatedTrainableParams ??
      (rawConfig.targetModules ? rawConfig.targetModules * rank * 2 : undefined),
  };

  if (!config.rlvrEnabled) {
    decision.messages.push('RLVR disabled: PEFT policy guardrails are inactive.');
    emitDecisionMetric(registry, decision, 'rlvr_disabled');
    return decision;
  }

  if (svdInitializedAdapters.some((blocked) => adapter.startsWith(blocked))) {
    decision.issues.push({
      rule: 'svd_blocked',
      severity: 'error',
      requiresOverride: true,
      detail:
        'SVD-initialized adapters (PiSSA/MiLoRA/svd_init_*) can collapse under RLVR due to spectral misalignment.',
    });
  }

  if (adapter.startsWith('svd_init_')) {
    decision.issues.push({
      rule: 'svd_blocked',
      severity: 'error',
      requiresOverride: true,
      detail: 'Explicit SVD-init adapters are blocked for RLVR unless explicitly overridden.',
    });
  }

  if (rank < MIN_EFFECTIVE_RANK) {
    decision.issues.push({
      rule: 'rank_too_low',
      severity: 'error',
      requiresOverride: true,
      detail: `Adapter rank ${rank} is below the RLVR minimum of ${MIN_EFFECTIVE_RANK}.`,
    });
  }

  if (lowCapacityAdapters.includes(adapter)) {
    decision.issues.push({
      rule: 'low_capacity_adapter',
      severity: 'warn',
      requiresOverride: true,
      detail:
        'Adapters with extreme parameter reduction (Rank-1/VeRA/LN-only/IA3) bottleneck reasoning under RLVR.',
    });
  }

  if (!structuralAdapters.includes(adapter) && adapter === 'lora') {
    decision.issues.push({
      rule: 'structural_preferred',
      severity: 'warn',
      requiresOverride: false,
      detail: 'Structural variants (DoRA/AdaLoRA/MiSS) outperform vanilla LoRA under RLVR.',
    });
  }

  let primaryReason = 'ok';

  for (const issue of decision.issues) {
    primaryReason = issue.rule;
    if (issue.requiresOverride && !config.allowUnsafe && !config.warnOnly) {
      decision.allowed = false;
      decision.decision = 'error';
      decision.messages.push(issue.detail);
    } else {
      decision.overrideUsed = issue.requiresOverride && config.allowUnsafe;
      decision.decision = decision.decision === 'error' ? 'error' : 'warn';
      decision.messages.push(issue.detail);
      logger.warn?.(`RLVR PEFT guardrail: ${issue.detail}${decision.overrideUsed ? ' (override allowed)' : ''}`);
    }
  }

  if (decision.allowed && decision.decision === 'ok') {
    decision.messages.push('RLVR PEFT policy applied with structural defaults.');
  }

  logger.info?.(
    `RLVR adapter policy decision: adapter=${adapter}, rank=${rank}, allowed=${decision.allowed}, override=${decision.overrideUsed}`
  );

  emitDecisionMetric(registry, decision, primaryReason);

  return decision;
}
