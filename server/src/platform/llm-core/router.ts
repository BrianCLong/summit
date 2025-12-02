import { ModelProfile, RoutingContext, RoutingRule, CostEvent } from './types.js';

export interface CostCollector {
  record(event: CostEvent): Promise<void>;
}

export class RouterService {
  private profiles: Map<string, ModelProfile> = new Map();
  private rules: RoutingRule[] = [];

  constructor(
    profiles: ModelProfile[],
    rules: RoutingRule[],
    private collector?: CostCollector // Optional for testing/backward compat
  ) {
    profiles.forEach(p => this.profiles.set(p.id, p));
    this.rules = rules;
  }

  async selectModel(context: RoutingContext): Promise<ModelProfile> {
    // 1. Governance Checks
    if (context.riskLevel === 'CRITICAL') {
       // Only allow specific trusted models for critical risk
       // Implementation specific logic
    }

    // 2. Find matching rule
    const rule = this.rules.find(r => r.taskCategory === context.taskCategory);
    if (!rule) {
      throw new Error(`No routing rule found for category ${context.taskCategory}`);
    }

    let selectedProfile: ModelProfile | null = null;

    // 3. Select preferred model
    for (const modelId of rule.preferredModels) {
      const profile = this.profiles.get(modelId);
      if (profile) {
        // Check budget if applicable
        if (rule.maxBudgetPerCall) {
          // simple check, assumes 1k in/out roughly
          const estimatedCost = profile.costPer1KTokensInput + profile.costPer1KTokensOutput;
          if (estimatedCost > rule.maxBudgetPerCall) continue;
        }
        selectedProfile = profile;
        break;
      }
    }

    // 4. Fallback
    if (!selectedProfile) {
      const fallbackId = rule.fallbackModels[0];
      const fallback = this.profiles.get(fallbackId);
      if (!fallback) throw new Error('No valid model found after fallback');
      selectedProfile = fallback;
    }

    // 5. Emit Cost Estimation Event (Asynchronous)
    if (this.collector) {
      // Estimate with generic tokens for now since we don't have the actual prompt here yet
      // In a real router, we'd wrap the call and measure actuals.
      // Here we record the *intent* to use.
      const estimatedCost = this.createCostEvent(
        context,
        selectedProfile,
        1000,
        1000 // Generic estimation
      );
      await this.collector.record(estimatedCost).catch(console.error);
    }

    return selectedProfile;
  }

  estimateCost(profile: ModelProfile, tokensIn: number, tokensOut: number): number {
    return (tokensIn / 1000 * profile.costPer1KTokensInput) +
           (tokensOut / 1000 * profile.costPer1KTokensOutput);
  }

  createCostEvent(context: RoutingContext, profile: ModelProfile, tokensIn: number, tokensOut: number, taskId?: string): CostEvent {
    const cost = this.estimateCost(profile, tokensIn, tokensOut);
    return {
      tenantId: context.tenantId,
      modelId: profile.id,
      estimatedTokensIn: tokensIn,
      estimatedTokensOut: tokensOut,
      estimatedCost: cost,
      category: context.taskCategory,
      taskId,
      timestamp: new Date()
    };
  }
}
