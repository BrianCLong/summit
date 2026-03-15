import { SummitAgentAdapter, Trace, Metrics } from '../../sdk/agent-adapter';
import { convertToSummitArtifact } from '../utils/converter';

export class CrewAIAdapter implements SummitAgentAdapter {
  private events: any[] = [];
  private metrics: Metrics = {
    invocations: 0,
    tokens: 0,
    latencyMs: 0
  };

  public recordEvent(event: any) {
    this.events.push(convertToSummitArtifact(event, 'crewai'));
    this.metrics.invocations++;
  }

  async emitTrace(): Promise<Trace> {
    return {
      id: `ca-${Date.now()}`,
      timestamp: Date.now(),
      events: [...this.events]
    };
  }

  async emitMetrics(): Promise<Metrics> {
    return { ...this.metrics };
  }
}
