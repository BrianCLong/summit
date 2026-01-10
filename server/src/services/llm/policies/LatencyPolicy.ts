
import { RoutingPolicy, LLMProvider, LLMRequest, LLMRouterConfig } from '../interfaces.js';

export class LatencyPolicy implements RoutingPolicy {
  name = 'latency';

  selectProvider(
    candidates: LLMProvider[],
    request: LLMRequest,
    config: LLMRouterConfig
  ): LLMProvider | null {
    // Sort by estimated latency
    const sorted = [...candidates].sort((a, b) => {
        const estA = a.estimate(request.taskType, 100);
        const estB = b.estimate(request.taskType, 100);
        return estA.p95ms - estB.p95ms;
    });

    return sorted[0] || null;
  }
}
