import { ModelCatalog, ModelSpec } from './modelCatalog';
import { DifficultySignal } from '../difficulty/difficulty';

export interface RoutingDecision {
  modelId: string;
  estimatedCost: number;
  reason: string;
}

export class CostAwareLLMRouter {
  constructor(private catalog: ModelCatalog) {}

  route(
    difficulty: DifficultySignal,
    estimatedInputTokens: number,
    budgetUsd: number = Infinity,
    requiredCapabilities: Partial<ModelSpec['capabilities']> = {}
  ): RoutingDecision {
    // 1. Filter by capabilities
    let candidates = this.catalog.listModels().filter(m =>
        Object.entries(requiredCapabilities).every(([k, v]) => !v || m.capabilities[k as keyof ModelSpec['capabilities']])
    );

    if (candidates.length === 0) {
      throw new Error("No models match required capabilities");
    }

    // 2. Filter by budget
    // We assume output tokens approx = input tokens (simple heuristic) or 1000 fixed
    const estimatedOutputTokens = 1000;
    candidates = candidates.filter(m => {
      const cost = (estimatedInputTokens * m.costPerInputToken) + (estimatedOutputTokens * m.costPerOutputToken);
      return cost <= budgetUsd;
    });

    if (candidates.length === 0) {
      // Fallback: try to find cheapest model even if over budget, but warn?
      // Or strict fail. Let's do strict fail but with a specific error so caller can handle.
      // Actually, let's return the cheapest capable model but mark reason as "budget exceeded fallback"
      // Wait, MWS says "refuse/downgrade".
      // Let's degrade to cheapest model.
      const cheapest = this.catalog.getCheapestModel(requiredCapabilities);
      const cost = (estimatedInputTokens * cheapest.costPerInputToken) + (estimatedOutputTokens * cheapest.costPerOutputToken);
      return {
        modelId: cheapest.id,
        estimatedCost: cost,
        reason: "Budget exceeded; fallback to cheapest model"
      };
    }

    // 3. Select based on difficulty
    let selectedModel: ModelSpec;
    let reason: string;

    if (difficulty.band === 'hard') {
      // Prefer high tier
      const highTier = candidates.filter(m => m.tier === 'high');
      if (highTier.length > 0) {
        // Pick best matching domain
        selectedModel = this.selectBestDomainMatch(highTier, difficulty.domain);
        reason = "Hard task: High tier model selected";
      } else {
        selectedModel = candidates[0]; // fallback to whatever is available
        reason = "Hard task: High tier not available within budget";
      }
    } else if (difficulty.band === 'medium') {
      // Prefer high tier if cheap enough, else medium/low?
      // Let's say medium prefers high tier but is okay with low tier if budget is tight.
      // Since we already filtered by budget, any candidate is affordable.
      // So pick high tier if available.
      const highTier = candidates.filter(m => m.tier === 'high');
      if (highTier.length > 0) {
         selectedModel = this.selectBestDomainMatch(highTier, difficulty.domain);
         reason = "Medium task: High tier model affordable";
      } else {
         selectedModel = this.selectBestDomainMatch(candidates, difficulty.domain);
         reason = "Medium task: Low tier model selected (budget constrained)";
      }
    } else {
      // Easy: prefer cheapest
      selectedModel = candidates.reduce((prev, curr) =>
        curr.costPerInputToken < prev.costPerInputToken ? curr : prev
      );
      reason = "Easy task: Cheapest model selected";
    }

    const estimatedCost = (estimatedInputTokens * selectedModel.costPerInputToken) + (estimatedOutputTokens * selectedModel.costPerOutputToken);

    return {
      modelId: selectedModel.id,
      estimatedCost,
      reason
    };
  }

  private selectBestDomainMatch(candidates: ModelSpec[], domain: string): ModelSpec {
     // Sort by domain match, then by cost (descending? no, we want best quality usually? or cheapest among best?)
     // Let's assume within a tier, we want best domain match. Tie-break with cost (cheaper is better).
     return candidates.sort((a, b) => {
        const aHasDomain = a.domains.includes(domain);
        const bHasDomain = b.domains.includes(domain);
        if (aHasDomain && !bHasDomain) return -1;
        if (!aHasDomain && bHasDomain) return 1;
        return a.costPerInputToken - b.costPerInputToken;
     })[0];
  }
}
