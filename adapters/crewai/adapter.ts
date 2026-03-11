import { SummitAgentAdapter, Trace, Metrics } from '../../sdk/agent-adapter';
import { formatEvents, convertMetrics } from '../utils/conversion';

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
    return {
      id: `ca-${Date.now()}`,
      timestamp: Date.now(),
      events: formatEvents([...this.events])
    };
  }

  async emitMetrics(): Promise<Metrics> {
    return convertMetrics({ ...this.metrics });
  }
}
