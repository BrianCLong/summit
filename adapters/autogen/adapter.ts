import { SummitAgentAdapter, Trace, Metrics } from '../../sdk/agent-adapter';
import { convertToSummitTrace, convertToSummitMetrics } from '../conversion';

export class AutoGenAdapter implements SummitAgentAdapter {
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
    return convertToSummitTrace('ag', this.events);
  }

  async emitMetrics(): Promise<Metrics> {
    return convertToSummitMetrics(this.metrics);
  }
}
