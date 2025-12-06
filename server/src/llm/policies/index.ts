import { RoutingPolicy, ProviderAdapter, LLMRequest } from '../types.js';

export class CostControlPolicy implements RoutingPolicy {
  name = 'cost-control';

  constructor(private maxCostPerRequest: number = 0.05) {}

  async sortProviders(providers: ProviderAdapter[], request: LLMRequest): Promise<ProviderAdapter[]> {
    // 1. Filter expensive providers
    const allowed = providers.filter(p => {
        const cost = p.estimateCost(request);
        return cost <= (request.budget?.maxCost || this.maxCostPerRequest);
    });

    // 2. Sort by cost (cheapest first)
    return allowed.sort((a, b) => a.estimateCost(request) - b.estimateCost(request));
  }
}

export class LatencyPolicy implements RoutingPolicy {
  name = 'latency-optimization';

  async sortProviders(providers: ProviderAdapter[], request: LLMRequest): Promise<ProviderAdapter[]> {
    // Sort by estimated latency
    return [...providers].sort((a, b) => {
        const capA = a.getCapabilities().find(c => c.name === request.model) || a.getCapabilities()[0];
        const capB = b.getCapabilities().find(c => c.name === request.model) || b.getCapabilities()[0];
        return (capA.avgLatencyMs || 1000) - (capB.avgLatencyMs || 1000);
    });
  }
}
