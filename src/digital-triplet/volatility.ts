import { LayerSignal, TripletState } from './types.js';

export class VolatilityScanner {
  private readonly windows = new Map<string, number[]>();

  constructor(private readonly window = 5) {}

  scan(tripletId: string, signals: LayerSignal[], state: TripletState): number {
    const magnitudes = signals.flatMap((signal) => this.valuesFor(signal));
    if (magnitudes.length === 0) {
      magnitudes.push(state.driftScore, state.resilienceScore, state.intentBudget);
    }

    const current = this.windows.get(tripletId) ?? [];
    const mean = magnitudes.reduce((sum, value) => sum + value, 0) / magnitudes.length;
    const variance =
      magnitudes.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      Math.max(1, magnitudes.length - 1);
    const deviation = Math.sqrt(variance);

    current.push(deviation);
    if (current.length > this.window) current.shift();
    this.windows.set(tripletId, current);

    const normalized = Number(Math.min(2, Math.max(0, deviation)).toFixed(4));
    return normalized;
  }

  private valuesFor(signal: LayerSignal): number[] {
    if (signal.type === 'physical') {
      return Object.values(signal.metrics).map((value) => Math.abs(value));
    }
    if (signal.type === 'digital') {
      return Object.values(signal.stateVector).map((value) => Math.abs(value));
    }
    return [Math.abs(signal.confidence)];
  }
}
