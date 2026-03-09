import { FeedbackAction, LayerSignal, TripletState } from './types.js';

export interface AdversarialScan {
  readonly actions: FeedbackAction[];
  readonly score: number;
  readonly findings: number;
}

export class AdversarialScanner {
  constructor(private readonly divergenceThreshold = 0.35) {}

  scan(tripletId: string, signals: LayerSignal[], state: TripletState): AdversarialScan {
    const divergences = this.measureDivergence(signals, state);
    const hasInjection = signals.some((signal) => signal.type === 'cognitive' && signal.confidence < 0.15);
    const score = Math.min(1.5, Number((divergences + (hasInjection ? 0.25 : 0)).toFixed(4)));
    const actions: FeedbackAction[] = [];

    if (score >= this.divergenceThreshold) {
      actions.push({
        target: 'physical',
        severity: 'critical',
        summary: 'Isolate sensor cluster and re-verify calibrations',
        controlVector: { adversarialScore: score },
      });
      actions.push({
        target: 'digital',
        severity: 'warn',
        summary: 'Recompute model priors under contested data',
        controlVector: { adversarialScore: score },
      });
    }

    if (hasInjection) {
      actions.push({
        target: 'cognitive',
        severity: 'warn',
        summary: 'Quarantine low-confidence intent and request authenticated oversight',
        controlVector: { contestedIntent: 1 },
      });
    }

    return { actions, score, findings: actions.length };
  }

  private measureDivergence(signals: LayerSignal[], state: TripletState): number {
    const physicalMean = this.mean(Object.values(this.aggregateMetrics(signals, 'physical')));
    const digitalMean = this.mean(Object.values(this.aggregateMetrics(signals, 'digital')));
    const resiliencePenalty = Math.max(0, 1 - state.resilienceScore) * 0.1;
    const entropyPenalty = state.entropyScore * 0.05;
    const volatilityPenalty = state.volatilityScore * 0.02;
    const divergence = Math.abs(physicalMean - digitalMean);
    return Number((divergence + resiliencePenalty + entropyPenalty + volatilityPenalty).toFixed(4));
  }

  private aggregateMetrics(signals: LayerSignal[], type: LayerSignal['type']): Record<string, number> {
    return signals
      .filter((signal) => signal.type === type)
      .reduce<Record<string, number>>((acc, signal) => {
        const payload = signal.type === 'physical' ? signal.metrics : signal.type === 'digital' ? signal.stateVector : {};
        Object.entries(payload).forEach(([key, value]) => {
          acc[key] = (acc[key] ?? 0) + value;
        });
        return acc;
      }, {});
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
