import { FeedbackAction, LayerSignal, TripletState } from '../types.js';

interface SafetySentinelConfig {
  readonly shockThreshold: number;
  readonly anomalyWindow: number;
}

export class SafetySentinel {
  private readonly recentAnomalies = new Map<string, number[]>();

  constructor(private readonly config: SafetySentinelConfig) {}

  guard(state: TripletState, signals: LayerSignal[]): FeedbackAction[] {
    const anomalies = signals.filter((signal) => this.isAnomalous(signal));
    const totalAnomalies = this.bumpAnomalies(state.id, anomalies.length);
    const actions: FeedbackAction[] = [];

    if (anomalies.length > 0) {
      actions.push({
        target: 'physical',
        severity: 'critical',
        summary: 'Shock dampening and isolation',
        controlVector: { anomalies: anomalies.length },
      });
    }

    if (totalAnomalies >= this.config.anomalyWindow) {
      actions.push({
        target: 'digital',
        severity: 'warn',
        summary: 'Reconcile simulation with anomalous series',
        controlVector: { anomalyWindow: this.config.anomalyWindow },
      });
    }

    if (state.resilienceScore < 0.6) {
      actions.push({
        target: 'cognitive',
        severity: 'warn',
        summary: 'Request human-in-the-loop review',
        controlVector: { resilienceScore: state.resilienceScore },
      });
    }

    return actions;
  }

  private isAnomalous(signal: LayerSignal): boolean {
    if (signal.type === 'physical') {
      return Object.values(signal.metrics).some((value) => Math.abs(value) >= this.config.shockThreshold);
    }
    if (signal.type === 'digital') {
      return Object.values(signal.stateVector).some((value) => value <= 0 || value >= 1.5);
    }
    return signal.confidence < 0.2;
  }

  private bumpAnomalies(tripletId: string, count: number): number {
    const window = this.recentAnomalies.get(tripletId) ?? [];
    window.push(count);
    if (window.length > this.config.anomalyWindow) {
      window.shift();
    }
    const total = window.reduce((sum, value) => sum + value, 0);
    this.recentAnomalies.set(tripletId, window);
    return total;
  }
}
