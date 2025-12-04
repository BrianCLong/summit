import { ForesightBundle } from '../types';

export class TrajectoryPredictor {
  private transitionMatrix: Map<string, Map<string, number>>;
  private history: string[];

  constructor() {
    this.transitionMatrix = new Map();
    this.history = [];
    // Seed with some basic transitions
    this.learn('init', 'search_users');
    this.learn('search_users', 'view_profile');
    this.learn('view_profile', 'inspect_graph');
  }

  public recordStep(state: string) {
    if (this.history.length > 0) {
      const lastState = this.history[this.history.length - 1];
      this.learn(lastState, state);
    }
    this.history.push(state);
    if (this.history.length > 50) this.history.shift(); // Keep window small
  }

  private learn(from: string, to: string) {
    if (!this.transitionMatrix.has(from)) {
      this.transitionMatrix.set(from, new Map());
    }
    const transitions = this.transitionMatrix.get(from)!;
    const count = transitions.get(to) || 0;
    transitions.set(to, count + 1);
  }

  public predict(currentState: string, horizon: number = 3): ForesightBundle[] {
    const bundles: ForesightBundle[] = [];
    let current = currentState;
    let probability = 1.0;

    for (let i = 0; i < horizon; i++) {
      const transitions = this.transitionMatrix.get(current);
      if (!transitions) break;

      // Find most likely next step
      let bestNext = '';
      let maxCount = -1;
      let total = 0;

      for (const [next, count] of transitions.entries()) {
        total += count;
        if (count > maxCount) {
          maxCount = count;
          bestNext = next;
        }
      }

      if (bestNext) {
        const p = maxCount / total;
        probability *= p;
        current = bestNext;

        if (probability > 0.3) {
           bundles.push({
            id: `pred-${Date.now()}-${i}`,
            contextParams: { predictedState: current, hop: i + 1 },
            probability: Number(probability.toFixed(2)),
            utility: 0.8, // Static for now
            reason: `Likely transition from ${currentState} (p=${probability.toFixed(2)})`,
            expiresAt: Date.now() + 60000
          });
        }
      } else {
        break;
      }
    }

    return bundles;
  }
}
