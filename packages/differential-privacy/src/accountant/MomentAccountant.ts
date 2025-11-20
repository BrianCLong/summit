/**
 * Moment Accountant for Differential Privacy
 * Tracks privacy loss using moment generating functions
 * Based on "Deep Learning with Differential Privacy" (Abadi et al., 2016)
 */

import { MomentAccountantState, RenyiDPParameters } from '../types.js';

export class MomentAccountant {
  private state: MomentAccountantState;

  constructor(
    samplingProbability: number,
    noiseMultiplier: number,
    orders: number[] = [1.25, 1.5, 2, 3, 4, 5, 6, 8, 16, 32, 64]
  ) {
    this.state = {
      logMoments: new Array(orders.length).fill(0),
      orders,
      samplingProbability,
      noiseMultiplier,
      steps: 0,
    };
  }

  /**
   * Update moments after a DP operation
   */
  step(): void {
    this.state.steps++;

    for (let i = 0; i < this.state.orders.length; i++) {
      const lambda = this.state.orders[i];
      const logMoment = this.computeLogMoment(
        lambda,
        this.state.samplingProbability,
        this.state.noiseMultiplier
      );

      this.state.logMoments[i] += logMoment;
    }
  }

  /**
   * Get current privacy guarantee (ε, δ)
   */
  getPrivacy(delta: number): { epsilon: number; delta: number } {
    if (delta <= 0 || delta >= 1) {
      throw new Error('Delta must be in (0, 1)');
    }

    const epsilons = this.state.orders.map((lambda, i) => {
      return (
        (this.state.logMoments[i] - Math.log(delta)) / (lambda - 1)
      );
    });

    const epsilon = Math.min(...epsilons);

    return { epsilon, delta };
  }

  /**
   * Compute log moment for Gaussian mechanism
   */
  private computeLogMoment(
    lambda: number,
    samplingProbability: number,
    noiseMultiplier: number
  ): number {
    // For subsampled Gaussian mechanism
    // This is an approximation of the moment generating function

    if (samplingProbability === 0) {
      return 0;
    }

    // Compute log(E[exp(λX)]) where X is the privacy loss random variable
    const c = samplingProbability;
    const sigma = noiseMultiplier;

    // Using the approximate formula from Abadi et al.
    const logMoment =
      c *
      (lambda * (lambda + 1) / (2 * sigma * sigma) +
        Math.log(1 + c * (Math.exp(lambda / (sigma * sigma)) - 1)));

    return logMoment;
  }

  /**
   * Reset accountant state
   */
  reset(): void {
    this.state.logMoments = new Array(this.state.orders.length).fill(0);
    this.state.steps = 0;
  }

  /**
   * Get current state
   */
  getState(): MomentAccountantState {
    return { ...this.state };
  }

  /**
   * Set state (for resuming computation)
   */
  setState(state: MomentAccountantState): void {
    this.state = { ...state };
  }
}

/**
 * Renyi Differential Privacy Accountant
 * More precise privacy analysis using Renyi divergence
 */
export class RenyiAccountant {
  private alphas: number[];
  private epsilons: number[];
  private steps: number;

  constructor(alphas: number[] = [2, 3, 4, 5, 10, 20, 50, 100]) {
    this.alphas = alphas;
    this.epsilons = new Array(alphas.length).fill(0);
    this.steps = 0;
  }

  /**
   * Add Renyi DP guarantee
   */
  addOperation(params: RenyiDPParameters): void {
    const alphaIdx = this.alphas.indexOf(params.alpha);

    if (alphaIdx === -1) {
      throw new Error(`Alpha ${params.alpha} not tracked`);
    }

    this.epsilons[alphaIdx] += params.epsilon;
    this.steps++;
  }

  /**
   * Convert Renyi DP to (ε, δ)-DP
   */
  getPrivacy(delta: number): { epsilon: number; delta: number } {
    if (delta <= 0 || delta >= 1) {
      throw new Error('Delta must be in (0, 1)');
    }

    const epsilons = this.alphas.map((alpha, i) => {
      const renyiEpsilon = this.epsilons[i];
      // Convert: ε = ε_α + log(1/δ) / (α - 1)
      return renyiEpsilon + Math.log(1 / delta) / (alpha - 1);
    });

    const epsilon = Math.min(...epsilons);

    return { epsilon, delta };
  }

  /**
   * Compose Renyi DP guarantees
   */
  compose(operations: RenyiDPParameters[]): RenyiDPParameters[] {
    const composed: Map<number, number> = new Map();

    for (const op of operations) {
      const current = composed.get(op.alpha) ?? 0;
      composed.set(op.alpha, current + op.epsilon);
    }

    return Array.from(composed.entries()).map(([alpha, epsilon]) => ({
      alpha,
      epsilon,
    }));
  }

  /**
   * Reset accountant
   */
  reset(): void {
    this.epsilons = new Array(this.alphas.length).fill(0);
    this.steps = 0;
  }

  /**
   * Get detailed privacy analysis
   */
  getAnalysis(delta: number): {
    epsilon: number;
    delta: number;
    bestAlpha: number;
    allGuarantees: Array<{ alpha: number; epsilon: number }>;
  } {
    const guarantees = this.alphas.map((alpha, i) => {
      const renyiEpsilon = this.epsilons[i];
      const epsilon = renyiEpsilon + Math.log(1 / delta) / (alpha - 1);
      return { alpha, epsilon };
    });

    const best = guarantees.reduce((min, curr) =>
      curr.epsilon < min.epsilon ? curr : min
    );

    return {
      epsilon: best.epsilon,
      delta,
      bestAlpha: best.alpha,
      allGuarantees: guarantees,
    };
  }
}
