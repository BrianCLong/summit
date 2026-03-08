import { DifficultySignal } from '../difficulty/difficulty.js';
import { ModelCatalog, ModelSpec } from './modelCatalog.js';

export interface RoutingDecision {
  modelId: string;
  provider: string;
  estimatedWorstCaseCost: number;
  reasons: string[];
}

export interface RouterConfig {
  maxBudget?: number; // Global cap
  fallbackModelId: string;
  allowedProviders?: string[];
}

export class CostAwareLLMRouter {
  constructor(
    private catalog: ModelCatalog,
    private config: RouterConfig = { fallbackModelId: "gpt-4o-mini" }
  ) {}

  async route(difficulty: DifficultySignal, context?: { budget?: number }): Promise<RoutingDecision> {
    const models = await this.catalog.getModels();
    const budget = context?.budget ?? this.config.maxBudget ?? 1.0; // Default budget if undefined

    // Filter by allowed providers
    let candidates = models;
    if (this.config.allowedProviders) {
      candidates = candidates.filter(m => this.config.allowedProviders!.includes(m.provider));
    }

    // Filter by capabilities based on difficulty
    if (difficulty.band === 'hard') {
      candidates = candidates.filter(m => m.capabilities.reasoning);
    }

    // Sort by cost (ascending) to find cheapest viable
    candidates.sort((a, b) => a.costPer1kTokens - b.costPer1kTokens);

    // Find best fit under budget
    // Estimated tokens: let's assume worst case 4k tokens for safety in estimation
    const EST_TOKENS_K = 4;

    let selectedModel: ModelSpec | undefined;
    let reasons: string[] = [];

    // Strategy:
    // If easy -> pick cheapest.
    // If medium -> pick cheapest with some capability or balanced.
    // If hard -> pick most capable that fits budget.

    if (difficulty.band === 'easy') {
      // Pick cheapest that fits budget
      selectedModel = candidates.find(m => m.costPer1kTokens * EST_TOKENS_K <= budget);
      if (selectedModel) reasons.push("Selected cheapest model for easy task");
    } else if (difficulty.band === 'medium') {
      // Pick cheapest capable (already filtered/sorted), but maybe prefer 'reasoning' if possible
      // Since we didn't strictly filter reasoning for medium, let's prioritize it if budget allows
      const reasoningModels = candidates.filter(m => m.capabilities.reasoning);
      const affordableReasoning = reasoningModels.find(m => m.costPer1kTokens * EST_TOKENS_K <= budget);

      if (affordableReasoning) {
        selectedModel = affordableReasoning;
        reasons.push("Selected affordable reasoning model for medium task");
      } else {
        // Fallback to any affordable
        selectedModel = candidates.find(m => m.costPer1kTokens * EST_TOKENS_K <= budget);
        if (selectedModel) reasons.push("Budget constrained: selected cheapest viable model");
      }
    } else { // Hard
      // Pick BEST model that fits budget (highest cost that is <= budget, assuming cost ~ capability)
      // Candidates are sorted asc by cost. So reverse to find most expensive (capable) under budget.
      for (let i = candidates.length - 1; i >= 0; i--) {
        if (candidates[i].costPer1kTokens * EST_TOKENS_K <= budget) {
          selectedModel = candidates[i];
          reasons.push("Selected most capable model within budget for hard task");
          break;
        }
      }
    }

    if (!selectedModel) {
      // Fallback
      selectedModel = (await this.catalog.getModel(this.config.fallbackModelId))!;
      reasons.push(`No model met criteria/budget (${budget}), using fallback`);
    }

    return {
      modelId: selectedModel.id,
      provider: selectedModel.provider,
      estimatedWorstCaseCost: selectedModel.costPer1kTokens * EST_TOKENS_K,
      reasons: [...reasons, ...difficulty.reasons]
    };
  }
}
