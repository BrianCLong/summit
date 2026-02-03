import type { ModelCatalog } from "./ModelCatalog";
import type { ModelConfig, RouteDecision } from "./types";

export type RoutingPolicy = {
  // thresholds are 0..1
  easyMax: number;      // e.g. 0.30
  mediumMax: number;    // e.g. 0.70
  // budget is relative "credits" for routing decisions
  // if undefined, router ignores budget constraints
  budget?: number;
  // optional hard preference per domain
  domainOverrides?: Record<string, { preferModelIds: string[] }>;
};

export class CostAwareRouter {
  constructor(
    private readonly catalog: ModelCatalog,
    private readonly policy: RoutingPolicy
  ) {}

  selectModel(input: { difficulty: number; domain: string }): RouteDecision {
    const { difficulty, domain } = input;

    // 1) domain overrides
    const override = this.policy.domainOverrides?.[domain];
    if (override?.preferModelIds?.length) {
      const m = override.preferModelIds
        .map(id => this.catalog.byId(id))
        .find(Boolean) as ModelConfig | undefined;

      if (m) return { model: m, reason: `domain override for ${domain}` };
    }

    // 2) candidate set
    const all = this.catalog.list();

    // 3) choose target capability band
    const targetCap =
      difficulty <= this.policy.easyMax ? 0.45 :
      difficulty <= this.policy.mediumMax ? 0.65 :
      0.85;

    // 4) score candidates: prefer adequate capability, then lower cost
    const scored = all
      .map(m => ({
        m,
        score:
          // capability closeness (higher is better if >= target)
          (m.capability >= targetCap ? 1.0 : m.capability / targetCap) * 0.70 +
          // domain preference bump
          (m.domains?.includes(domain) ? 0.10 : 0) +
          // cost favor
          (1 / (1 + m.costWeight)) * 0.20
      }))
      .sort((a, b) => b.score - a.score);

    // 5) budget gating: pick best model under budget if provided
    if (this.policy.budget != null) {
      const within = scored.find(x => x.m.costWeight <= this.policy.budget!);
      if (within) {
        return { model: within.m, reason: `best within budget=${this.policy.budget}` };
      }
      // if nothing fits, pick cheapest
      const cheapest = [...all].sort((a, b) => a.costWeight - b.costWeight)[0];
      return { model: cheapest, reason: `budget too low; fell back to cheapest` };
    }

    return { model: scored[0].m, reason: `best match for targetCap=${targetCap.toFixed(2)}` };
  }
}
