export type ThinkingMode = 'off' | 'normal' | 'heavy';

export type ReasoningRedactionPolicy = 'none' | 'summary_only';

export interface ReasoningBudgetContract {
  thinkMode: ThinkingMode;
  thinkingBudget: number;
  maxTokens: number;
  toolBudget: number;
  timeBudgetMs: number;
  redactionPolicy: ReasoningRedactionPolicy;
}

export interface ReasoningBudgetOutcome {
  success: boolean;
  latencyMs: number;
  totalCostUSD?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
}

export interface ReasoningBudgetEvidence {
  budget: ReasoningBudgetContract;
  outcome?: ReasoningBudgetOutcome;
  recordedAt: string;
}

export const DEFAULT_REASONING_BUDGET: ReasoningBudgetContract = {
  thinkMode: 'normal',
  thinkingBudget: 1024,
  maxTokens: 2048,
  toolBudget: 16,
  timeBudgetMs: 60000,
  redactionPolicy: 'summary_only',
};

const MIN_BUDGET = 0;

function clampNonNegative(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(MIN_BUDGET, Math.floor(value));
}

export function normalizeReasoningBudget(
  input?: Partial<ReasoningBudgetContract> | null,
): ReasoningBudgetContract {
  const base = DEFAULT_REASONING_BUDGET;
  const thinkMode = input?.thinkMode ?? base.thinkMode;
  const thinkingBudget = clampNonNegative(
    input?.thinkingBudget ?? base.thinkingBudget,
    base.thinkingBudget,
  );
  const maxTokens = clampNonNegative(
    input?.maxTokens ?? base.maxTokens,
    base.maxTokens,
  );
  const toolBudget = clampNonNegative(
    input?.toolBudget ?? base.toolBudget,
    base.toolBudget,
  );
  const timeBudgetMs = clampNonNegative(
    input?.timeBudgetMs ?? base.timeBudgetMs,
    base.timeBudgetMs,
  );
  const redactionPolicy = input?.redactionPolicy ?? base.redactionPolicy;

  return {
    thinkMode,
    thinkingBudget: thinkMode === 'off' ? 0 : thinkingBudget,
    maxTokens,
    toolBudget,
    timeBudgetMs,
    redactionPolicy,
  };
}

export function buildBudgetEvidence(
  budget: ReasoningBudgetContract,
  outcome?: ReasoningBudgetOutcome,
  recordedAt: string = new Date().toISOString(),
): ReasoningBudgetEvidence {
  return {
    budget,
    outcome,
    recordedAt,
  };
}

export function summarizeBudgetForPolicy(
  budget: ReasoningBudgetContract,
): Record<string, number | string> {
  return {
    think_mode: budget.thinkMode,
    thinking_budget: budget.thinkingBudget,
    max_tokens: budget.maxTokens,
    tool_budget: budget.toolBudget,
    time_budget_ms: budget.timeBudgetMs,
    redaction_policy: budget.redactionPolicy,
  };
}
