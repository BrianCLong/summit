import { SummitAgentAdapter, Trace, Metrics } from '../../sdk/agent-adapter';
import { convertToTrace, convertToMetrics } from '../conversion';

export class CrewAIAdapter implements SummitAgentAdapter {
  private events: any[] = [];
  private metrics: Metrics = {
    invocations: 0,
    tokens: 0,
    latencyMs: 0
  };

  public recordEvent(event: any) {
    this.events.push(event);
    this.metrics.invocations++;
  }

  async emitTrace(): Promise<Trace> {
    return convertToTrace(`ca-${Date.now()}`, this.events);
  }

  async emitMetrics(): Promise<Metrics> {
    return convertToMetrics(
      this.metrics.invocations,
      this.metrics.tokens,
      this.metrics.latencyMs
    );
  }
}
