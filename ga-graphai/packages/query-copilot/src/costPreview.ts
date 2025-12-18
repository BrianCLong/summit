import { CostGuard } from '@ga-graphai/cost-guard';
import type {
  CostGuardDecision,
  QueryPlanSummary,
  TenantBudgetProfile,
} from '@ga-graphai/cost-guard';
import type { CostEstimate } from './types.js';

export interface ModelPricing {
  modelId: string;
  contextWindow: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  expectedLatencyMs?: number;
}

export interface TokenEstimates {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelSelectionImpact {
  selectedModel: ModelPricing;
  contextUsage: number;
  estimatedCostUSD: number;
  notes: string[];
}

export interface BudgetGuardPreview {
  decision: CostGuardDecision;
  plan: QueryPlanSummary;
}

export interface CopilotCostPreview {
  tokens: TokenEstimates;
  modelImpact: ModelSelectionImpact;
  budget: BudgetGuardPreview;
}

export interface CopilotCostPreviewInput {
  prompt: string;
  cypher: string;
  costEstimate: CostEstimate;
  models: ModelPricing[];
  tenantProfile?: TenantBudgetProfile;
  activeQueries?: number;
  recentLatencyP95?: number;
}

const AVG_CHARS_PER_TOKEN = 4;
const COMPLETION_TOKENS_PER_ROW = 8;
const MIN_COMPLETION_TOKENS = 80;

function estimatePromptTokens(prompt: string): number {
  const normalized = prompt.trim();
  if (!normalized) {
    return 0;
  }
  return Math.max(1, Math.ceil(normalized.length / AVG_CHARS_PER_TOKEN));
}

function estimateCompletionTokens(costEstimate: CostEstimate): number {
  const rowContribution = Math.ceil(
    costEstimate.anticipatedRows * COMPLETION_TOKENS_PER_ROW,
  );
  const latencyContribution = Math.round(costEstimate.estimatedLatencyMs / 50);
  return Math.max(MIN_COMPLETION_TOKENS, rowContribution + latencyContribution);
}

function calculateCostUSD(tokens: TokenEstimates, model: ModelPricing): number {
  const inputCost =
    (tokens.promptTokens / 1000) * model.inputCostPer1kTokens;
  const outputCost =
    (tokens.completionTokens / 1000) * model.outputCostPer1kTokens;
  return Number((inputCost + outputCost).toFixed(4));
}

function selectModel(
  models: ModelPricing[],
  tokens: TokenEstimates,
): ModelSelectionImpact {
  if (models.length === 0) {
    throw new Error('At least one model profile is required.');
  }
  const sorted = [...models].sort((a, b) => {
    const aCost = a.inputCostPer1kTokens + a.outputCostPer1kTokens;
    const bCost = b.inputCostPer1kTokens + b.outputCostPer1kTokens;
    return aCost - bCost;
  });

  const fitsContext = sorted.filter(
    (model) => model.contextWindow >= tokens.totalTokens,
  );
  const selected = fitsContext[0] ?? sorted[sorted.length - 1];

  const notes: string[] = [];
  if (!fitsContext.length) {
    notes.push(
      'No model fits the projected tokens; using the largest context window available.',
    );
  }

  const contextUsage = tokens.totalTokens / selected.contextWindow;
  if (contextUsage > 0.8) {
    notes.push('Projected tokens are close to the model context limit.');
  }

  const estimatedCostUSD = calculateCostUSD(tokens, selected);
  if (fitsContext.length && selected !== sorted[0]) {
    notes.push('Selected a higher-cost model to satisfy context window needs.');
  }

  return { selectedModel: selected, contextUsage, estimatedCostUSD, notes };
}

function detectCartesianProduct(cypher: string): boolean {
  const explicitCartesian = /MATCH\s*\([^)]*\)\s*,\s*\([^)]*\)/i.test(
    cypher,
  );
  const variableLengthFanOut = /-\[[^\]]*\*\s*(3|4|5|6|7|8|9|[1-9][0-9])/i.test(
    cypher,
  );
  return explicitCartesian || variableLengthFanOut;
}

function countOperations(cypher: string): number {
  const matches = cypher.match(/\b(MATCH|WITH|UNWIND|OPTIONAL MATCH|CALL)\b/gi);
  return Math.max(1, matches?.length ?? 1);
}

function countDepth(cypher: string): number {
  const relationships = cypher.match(/-[^>]*>|<-[^<]*-/g);
  return Math.max(1, relationships?.length ?? 1);
}

function buildPlanSummary(
  cypher: string,
  costEstimate: CostEstimate,
): QueryPlanSummary {
  return {
    estimatedRru: costEstimate.estimatedRru,
    estimatedLatencyMs: costEstimate.estimatedLatencyMs,
    depth: countDepth(cypher),
    operations: countOperations(cypher),
    containsCartesianProduct: detectCartesianProduct(cypher),
  };
}

export function buildCopilotCostPreview(
  input: CopilotCostPreviewInput,
): CopilotCostPreview {
  const promptTokens = estimatePromptTokens(input.prompt);
  const completionTokens = estimateCompletionTokens(input.costEstimate);
  const tokens: TokenEstimates = {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };

  const modelImpact = selectModel(input.models, tokens);
  const guard = new CostGuard(input.tenantProfile);
  const plan = buildPlanSummary(input.cypher, input.costEstimate);
  const decision = guard.planBudget({
    tenantId: input.tenantProfile?.tenantId ?? 'global-default',
    plan,
    profile: input.tenantProfile,
    activeQueries: input.activeQueries ?? 0,
    recentLatencyP95:
      input.recentLatencyP95 ?? input.costEstimate.estimatedLatencyMs,
  });

  return {
    tokens,
    modelImpact,
    budget: {
      decision,
      plan,
    },
  };
}
