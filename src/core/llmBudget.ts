export type BudgetScope = 'global' | 'environment' | 'feature' | 'tenant';
export type BudgetWindow = 'day' | 'week' | 'month';

export interface BudgetLimit {
  tokens?: number;
  usd?: number;
  requests?: number;
}

export type BudgetMode = 'hard' | 'soft';

export interface BudgetPolicy {
  id: string;
  scope: BudgetScope;
  window: BudgetWindow;
  mode: BudgetMode;
  limit: BudgetLimit;
  description?: string;
}

export interface BudgetUsage {
  tokens?: number;
  usd?: number;
  requests?: number;
}

export interface BudgetContext {
  environment: string;
  feature?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export enum BudgetDecision {
  ALLOW = 'ALLOW',
  SOFT_LIMIT = 'SOFT_LIMIT',
  HARD_LIMIT = 'HARD_LIMIT',
}

export interface BudgetDecisionResult {
  decision: BudgetDecision;
  triggered?: BudgetPolicy;
  projectedUsage: BudgetUsage;
  currentUsage: BudgetUsage;
  remaining?: BudgetLimit;
  scopeHit?: string;
  message?: string;
}

interface UsageEntry {
  timestamp: number;
  usage: Required<BudgetUsage>;
}

export interface BudgetUsageStore {
  record(key: string, usage: BudgetUsage, timestamp?: number): Promise<void>;
  getUsage(key: string, windowMs: number, now?: number): Promise<BudgetUsage>;
}

const toCompleteUsage = (usage: BudgetUsage): Required<BudgetUsage> => ({
  tokens: usage.tokens ?? 0,
  usd: usage.usd ?? 0,
  requests: usage.requests ?? 0,
});

const emptyUsage = (): Required<BudgetUsage> => ({
  tokens: 0,
  usd: 0,
  requests: 0,
});

const windowToMs = (window: BudgetWindow): number => {
  switch (window) {
    case 'day':
      return 24 * 60 * 60 * 1000;
    case 'week':
      return 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
};

const publicScopeLabel = (policy: BudgetPolicy): string =>
  policy.scope === 'tenant' ? 'tenant:[redacted]' : `${policy.scope}:${policy.id}`;

export class InMemoryBudgetStore implements BudgetUsageStore {
  private readonly records = new Map<string, UsageEntry[]>();

  async record(
    key: string,
    usage: BudgetUsage,
    timestamp: number = Date.now()
  ): Promise<void> {
    const entries = this.records.get(key) ?? [];
    entries.push({ timestamp, usage: toCompleteUsage(usage) });
    this.records.set(key, entries);
  }

  async getUsage(
    key: string,
    windowMs: number,
    now: number = Date.now()
  ): Promise<BudgetUsage> {
    const entries = this.records.get(key) ?? [];
    const filtered = entries.filter((entry) => now - entry.timestamp <= windowMs);
    this.records.set(key, filtered);

    return filtered.reduce<Required<BudgetUsage>>(
      (acc, entry) => ({
        tokens: acc.tokens + entry.usage.tokens,
        usd: acc.usd + entry.usage.usd,
        requests: acc.requests + entry.usage.requests,
      }),
      emptyUsage()
    );
  }
}

export interface BudgetPolicyProvider {
  getPolicies(context: BudgetContext): Promise<BudgetPolicy[]>;
}

export class StaticPolicyProvider implements BudgetPolicyProvider {
  private readonly policyIndex: Map<string, BudgetPolicy>;

  constructor(policies: BudgetPolicy[]) {
    this.policyIndex = new Map(
      policies.map((policy) => [`${policy.scope}:${policy.id}`, policy])
    );
  }

  async getPolicies(context: BudgetContext): Promise<BudgetPolicy[]> {
    const candidates: BudgetPolicy[] = [];
    const scopeKeys: [BudgetScope, string | undefined][] = [
      ['global', 'global'],
      ['environment', context.environment],
      ['feature', context.feature],
      ['tenant', context.tenantId],
    ];

    for (const [scope, id] of scopeKeys) {
      if (!id) continue;
      const policy = this.policyIndex.get(`${scope}:${id}`);
      if (policy) {
        candidates.push(policy);
      }
    }

    return candidates;
  }
}

export interface BudgetLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

export interface BudgetMetricsSnapshot {
  llm_budget_consumed_tokens: number;
  llm_budget_consumed_usd: number;
  llm_budget_blocked_requests_total: number;
}

export class BudgetMetrics {
  private consumedTokens = 0;
  private consumedUsd = 0;
  private blockedRequests = 0;

  recordConsumption(usage: BudgetUsage): void {
    this.consumedTokens += usage.tokens ?? 0;
    this.consumedUsd += usage.usd ?? 0;
  }

  recordBlocked(): void {
    this.blockedRequests += 1;
  }

  snapshot(): BudgetMetricsSnapshot {
    return {
      llm_budget_consumed_tokens: this.consumedTokens,
      llm_budget_consumed_usd: this.consumedUsd,
      llm_budget_blocked_requests_total: this.blockedRequests,
    };
  }
}

const sanitizeTenant = (tenantId?: string): string =>
  tenantId ? '[redacted-tenant]' : 'anonymous';

export interface BudgetEngineOptions {
  policyProvider?: BudgetPolicyProvider;
  usageStore?: BudgetUsageStore;
  logger?: BudgetLogger;
}

export interface EngineOverridesOptions {
  logger?: BudgetLogger;
  usageStore?: BudgetUsageStore;
}

export class LlmBudgetEngine {
  private readonly usageStore: BudgetUsageStore;
  private readonly policyProvider: BudgetPolicyProvider;
  private readonly logger?: BudgetLogger;
  private readonly metrics: BudgetMetrics;

  constructor(options: BudgetEngineOptions = {}) {
    this.usageStore = options.usageStore ?? new InMemoryBudgetStore();
    this.policyProvider =
      options.policyProvider ?? new StaticPolicyProvider(defaultPolicies());
    this.logger = options.logger;
    this.metrics = new BudgetMetrics();
  }

  async checkAndConsume(
    context: BudgetContext,
    usage: BudgetUsage,
    now: number = Date.now()
  ): Promise<BudgetDecisionResult> {
    const normalizedContext = {
      ...context,
      environment: context.environment || 'dev',
    };
    const policies = await this.policyProvider.getPolicies(normalizedContext);
    const scopedUsage = toCompleteUsage(usage);
    let decision: BudgetDecision = BudgetDecision.ALLOW;
    let triggered: BudgetPolicy | undefined;
    let remaining: BudgetLimit | undefined;
    let scopeHit: string | undefined;
    let scopeKeyHit: string | undefined;
    let currentUsage: BudgetUsage = emptyUsage();

    if (policies.length === 0) {
      this.metrics.recordConsumption(scopedUsage);
      return {
        decision,
        projectedUsage: scopedUsage,
        currentUsage: emptyUsage(),
      };
    }

    for (const policy of policies) {
      const key = `${policy.scope}:${policy.id}`;
      const windowMs = windowToMs(policy.window);
      const existing = await this.usageStore.getUsage(key, windowMs, now);
      const projected = {
        tokens: existing.tokens + scopedUsage.tokens,
        usd: existing.usd + scopedUsage.usd,
        requests: existing.requests + scopedUsage.requests,
      };

      const exceeded = isExceeded(projected, policy.limit);
      if (exceeded) {
        const policyDecision =
          policy.mode === 'hard'
            ? BudgetDecision.HARD_LIMIT
            : BudgetDecision.SOFT_LIMIT;

        if (
          policyDecision === BudgetDecision.HARD_LIMIT ||
          decision === BudgetDecision.ALLOW
        ) {
          decision = policyDecision;
          triggered = policy;
          remaining = calculateRemaining(policy.limit, projected);
          scopeHit = publicScopeLabel(policy);
          scopeKeyHit = key;
          currentUsage = existing;
        }
      } else if (!triggered) {
        currentUsage = existing;
        remaining = calculateRemaining(policy.limit, projected);
      }
    }

    if (decision === BudgetDecision.HARD_LIMIT) {
      this.metrics.recordBlocked();
      this.logger?.warn('LLM budget hard limit hit', {
        scope: triggered?.scope,
        scopeId: triggered?.id,
        environment: normalizedContext.environment,
        feature: normalizedContext.feature,
        tenant: sanitizeTenant(normalizedContext.tenantId),
        remaining,
      });
      return {
        decision,
        triggered,
        projectedUsage: scopedUsage,
        currentUsage,
        remaining,
        scopeHit,
        message: 'LLM budget exceeded; request blocked.',
      };
    }

    const matchingPolicies = policies.map((policy) => publicScopeLabel(policy));
    if (decision === BudgetDecision.SOFT_LIMIT) {
      this.logger?.warn('LLM budget soft limit reached', {
        scope: triggered?.scope,
        scopeId: triggered?.id,
        environment: normalizedContext.environment,
        feature: normalizedContext.feature,
        tenant: sanitizeTenant(normalizedContext.tenantId),
        remaining,
      });
    } else if (this.logger && matchingPolicies.length > 0) {
      this.logger.info('LLM budget check passed', {
        scopes: matchingPolicies,
        environment: normalizedContext.environment,
        feature: normalizedContext.feature,
        tenant: sanitizeTenant(normalizedContext.tenantId),
      });
    }

    const scopesToRecord =
      scopeKeyHit !== undefined
        ? policies.filter((policy) => `${policy.scope}:${policy.id}` === scopeKeyHit)
        : policies;

    for (const policy of scopesToRecord) {
      await this.usageStore.record(`${policy.scope}:${policy.id}`, scopedUsage, now);
    }
    this.metrics.recordConsumption(scopedUsage);

    return {
      decision,
      triggered,
      projectedUsage: scopedUsage,
      currentUsage,
      remaining,
      scopeHit,
    };
  }

  metricsSnapshot(): BudgetMetricsSnapshot {
    return this.metrics.snapshot();
  }
}

const isExceeded = (usage: Required<BudgetUsage>, limit: BudgetLimit): boolean => {
  if (limit.tokens !== undefined && usage.tokens > limit.tokens) return true;
  if (limit.usd !== undefined && usage.usd > limit.usd) return true;
  if (limit.requests !== undefined && usage.requests > limit.requests) return true;
  return false;
};

const calculateRemaining = (
  limit: BudgetLimit,
  usage: Required<BudgetUsage>
): BudgetLimit => ({
  tokens:
    limit.tokens !== undefined ? Math.max(limit.tokens - usage.tokens, 0) : undefined,
  usd: limit.usd !== undefined ? Math.max(limit.usd - usage.usd, 0) : undefined,
  requests:
    limit.requests !== undefined
      ? Math.max(limit.requests - usage.requests, 0)
      : undefined,
});

const defaultPolicies = (): BudgetPolicy[] => [
  {
    id: 'global',
    scope: 'global',
    window: 'day',
    mode: 'soft',
    limit: { tokens: 250_000, usd: 50, requests: 2_000 },
    description: 'Platform-wide backstop to prevent runaway usage.',
  },
  {
    id: 'sandbox',
    scope: 'environment',
    window: 'day',
    mode: 'hard',
    limit: { usd: 5, requests: 200 },
    description: 'Sandbox environments are capped tightly to control costs.',
  },
  {
    id: 'maestro_planning',
    scope: 'feature',
    window: 'day',
    mode: 'soft',
    limit: { tokens: 50_000 },
    description: 'Maestro planning workloads are throttled until upgraded.',
  },
];

export const loadBudgetOverrides = (
  overridesRaw: string | undefined
): BudgetPolicy[] => {
  if (!overridesRaw) return [];

  try {
    const parsed = JSON.parse(overridesRaw) as BudgetPolicy[];
    return parsed.filter(
      (override) => override.id && override.scope && override.window && override.limit
    );
  } catch (error) {
    throw new Error('Invalid LLM_BUDGET_OVERRIDES payload');
  }
};

export const mergePolicies = (
  base: BudgetPolicy[],
  overrides: BudgetPolicy[]
): BudgetPolicy[] => {
  const merged = new Map<string, BudgetPolicy>();
  for (const policy of base) {
    merged.set(`${policy.scope}:${policy.id}`, policy);
  }
  for (const override of overrides) {
    merged.set(`${override.scope}:${override.id}`, override);
  }
  return Array.from(merged.values());
};

export const createEngineWithOverrides = (
  overridesRaw?: string,
  options: EngineOverridesOptions = {}
): LlmBudgetEngine => {
  const overrides = loadBudgetOverrides(overridesRaw);
  const policies = mergePolicies(defaultPolicies(), overrides);
  return new LlmBudgetEngine({
    policyProvider: new StaticPolicyProvider(policies),
    logger: options.logger,
    usageStore: options.usageStore,
  });
};
