import { LayerSignal, TripletState } from './types.js';

export class EntropyCalibrator {
  private readonly windows = new Map<string, number[]>();

  constructor(private readonly window = 8) {}

  measure(tripletId: string, signals: LayerSignal[], state: TripletState): number {
    const values = this.collectValues(signals, state);
    if (values.length === 0) return 0;

    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    const probabilities = values.map((value) => value / total);
    const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log(p + Number.EPSILON), 0);
    const normalized = values.length > 1 ? entropy / Math.log(values.length) : 0;

    const history = this.windows.get(tripletId) ?? [];
    history.push(normalized);
    if (history.length > this.window) history.shift();
    this.windows.set(tripletId, history);

    const smoothed = history.reduce((sum, value) => sum + value, 0) / history.length;
    return Number(Math.min(2, Math.max(0, smoothed * 2)).toFixed(4));
  }

  private collectValues(signals: LayerSignal[], state: TripletState): number[] {
    const values: number[] = [];
    signals.forEach((signal) => {
      if (signal.type === 'physical') {
        values.push(...Object.values(signal.metrics).map((value) => Math.abs(value)));
      } else if (signal.type === 'digital') {
        values.push(...Object.values(signal.stateVector).map((value) => Math.abs(value)));
      } else {
        values.push(Math.abs(signal.confidence));
      }
    });

    if (values.length === 0) {
      values.push(
        Math.abs(state.driftScore) + 0.01,
        Math.abs(state.resilienceScore) + 0.01,
        Math.abs(state.intentBudget) + 0.01,
      );
    }

    return values.map((value) => Math.max(0.0001, value));
  }
}
