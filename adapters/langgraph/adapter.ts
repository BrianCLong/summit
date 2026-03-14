import { SummitAgentAdapter, Trace, Metrics } from '../../sdk/agent-adapter';
import { convertToSummitArtifact } from '../utils/converter';

export class LangGraphAdapter implements SummitAgentAdapter {
  private events: any[] = [];
  private metrics: Metrics = {
    invocations: 0,
    tokens: 0,
    latencyMs: 0
  };

  public recordEvent(event: any) {
    this.events.push(convertToSummitArtifact(event, 'langgraph'));
    this.metrics.invocations++;
    // Assume event might have token/latency data to parse in a real implementation
  }

  async emitTrace(): Promise<Trace> {
    return {
      id: `lg-${Date.now()}`,
      timestamp: Date.now(),
      events: [...this.events]
    };
  }

  async emitMetrics(): Promise<Metrics> {
    return { ...this.metrics };
  }
}
