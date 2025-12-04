import { LayerSignal, TripletState } from './types.js';

export class CohesionEngine {
  compute(signals: LayerSignal[], state: TripletState): number {
    const anchors = this.extractAnchors(signals, state);
    if (anchors.length <= 1) return 0.7;

    const mean = anchors.reduce((sum, value) => sum + value, 0) / anchors.length;
    const variance =
      anchors.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, anchors.length - 1);
    const spread = Math.sqrt(variance);
    const cohesion = 1 - spread / (Math.abs(mean) + 1);
    return Number(Math.max(0, Math.min(1, cohesion)).toFixed(4));
  }

  private extractAnchors(signals: LayerSignal[], state: TripletState): number[] {
    const anchors: number[] = [];

    signals.forEach((signal) => {
      if (signal.type === 'physical') {
        const values = Object.values(signal.metrics);
        if (values.length > 0) {
          const magnitude = values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;
          anchors.push(1 / (1 + magnitude));
        }
      } else if (signal.type === 'digital') {
        const values = Object.values(signal.stateVector);
        if (values.length > 0) {
          const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
          anchors.push(Math.max(0, Math.min(1, mean)));
        }
      } else if (signal.type === 'cognitive') {
        anchors.push(Math.max(0, Math.min(1, signal.confidence)));
      }
    });

    if (anchors.length === 0) {
      anchors.push(
        1 / (1 + state.driftScore),
        Math.min(1, state.resilienceScore / 2),
        Math.min(1, state.intentBudget / 1.5),
      );
    }

    return anchors;
  }
}
