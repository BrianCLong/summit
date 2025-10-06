import { Counter, Histogram } from 'prom-client';
import pino from 'pino';

const logger = pino({ name: 'llm-cost' });

export type ProviderKey = 'openai' | 'anthropic' | 'google' | 'perplexity';

const llmCallsTotal = new Counter({
  name: 'intelgraph_llm_calls_total',
  help: 'Total LLM calls issued by Copilot routing',
  labelNames: ['provider', 'model']
});

const llmLatencyMs = new Histogram({
  name: 'intelgraph_llm_latency_ms_bucket',
  help: 'LLM latency observed by provider/model',
  labelNames: ['provider', 'model'],
  buckets: [100, 250, 500, 1000, 2000, 4000, 8000, 16000]
});

const llmCostUsd = new Counter({
  name: 'intelgraph_llm_cost_usd_total',
  help: 'Total USD spend by provider/model',
  labelNames: ['provider', 'model']
});

const opaDenialsTotal = new Counter({
  name: 'intelgraph_llm_policy_denials_total',
  help: 'OPA denials for LLM routes',
  labelNames: ['policy', 'reason']
});

const providerSpend = new Map<ProviderKey, number>();

function parseBudget(value: string | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return parsed;
}

const providerBudgets: Record<ProviderKey, number> = {
  openai: parseBudget(process.env.OPENAI_BUDGET_USD),
  anthropic: parseBudget(process.env.ANTHROPIC_BUDGET_USD),
  google: parseBudget(process.env.GOOGLE_BUDGET_USD),
  perplexity: parseBudget(process.env.PERPLEXITY_BUDGET_USD)
};

const PER_BRIEF_CAP = parseBudget(process.env.PER_BRIEF_CAP_USD);

export interface LLMCallRecord {
  provider: ProviderKey;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  purpose?: string;
  routeReason?: string;
}

export function recordLLMCall(record: LLMCallRecord): { withinBudget: boolean; remaining: number } {
  llmCallsTotal.inc({ provider: record.provider, model: record.model });
  llmLatencyMs.observe({ provider: record.provider, model: record.model }, record.latencyMs);
  llmCostUsd.inc({ provider: record.provider, model: record.model }, record.costUsd);

  const spent = (providerSpend.get(record.provider) ?? 0) + (record.costUsd || 0);
  providerSpend.set(record.provider, spent);
  const budget = providerBudgets[record.provider];
  const remaining = budget === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, budget - spent);

  if (budget !== Number.POSITIVE_INFINITY && spent > budget) {
    logger.warn(
      {
        provider: record.provider,
        model: record.model,
        spent,
        budget,
        routeReason: record.routeReason
      },
      'Provider budget exceeded'
    );
  }

  return { withinBudget: spent <= budget, remaining };
}

export function recordPolicyDenial(policy: string, reason?: string): void {
  opaDenialsTotal.inc({ policy, reason: reason || 'unspecified' });
}

export function getBudgetForProvider(provider: ProviderKey): number {
  return providerBudgets[provider];
}

export function getProviderSpend(provider: ProviderKey): number {
  return providerSpend.get(provider) ?? 0;
}

export function getPerBriefCap(): number {
  return PER_BRIEF_CAP;
}

export function isWithinPerBriefCap(costUsd: number): boolean {
  if (PER_BRIEF_CAP === Number.POSITIVE_INFINITY) return true;
  return costUsd <= PER_BRIEF_CAP;
}

export function estimateCost(
  provider: ProviderKey,
  tokensIn: number,
  tokensOut: number
): number {
  const rates = {
    openai: {
      in: Number(process.env.COST_OAI_IN || 0.000005),
      out: Number(process.env.COST_OAI_OUT || 0.000015)
    },
    anthropic: {
      in: Number(process.env.COST_ANTHROPIC_IN || 0.000008),
      out: Number(process.env.COST_ANTHROPIC_OUT || 0.000024)
    },
    google: {
      in: Number(process.env.COST_GOOGLE_IN || 0.000007),
      out: Number(process.env.COST_GOOGLE_OUT || 0.000021)
    },
    perplexity: {
      in: Number(process.env.COST_PERPLEXITY_IN || 0.00001),
      out: Number(process.env.COST_PERPLEXITY_OUT || 0.00002)
    }
  } as const;

  const rate = rates[provider];
  const cost = tokensIn * rate.in + tokensOut * rate.out;
  return Number.isFinite(cost) ? Number(cost.toFixed(6)) : 0;
}
