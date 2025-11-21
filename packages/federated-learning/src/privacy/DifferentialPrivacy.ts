import { pino, type Logger } from 'pino';

export interface PrivacyBudget {
  epsilon: number; // Privacy loss parameter
  delta: number; // Failure probability
  spent: number; // Amount of budget spent
  remaining: number; // Remaining budget
}

export interface NoiseParameters {
  mechanism: 'gaussian' | 'laplace';
  sensitivity: number;
  epsilon: number;
  delta?: number;
}

/**
 * Differential Privacy
 * Implements privacy-preserving mechanisms for federated learning
 */
export class DifferentialPrivacy {
  private logger: Logger;
  private privacyBudget: PrivacyBudget;

  constructor(epsilon: number, delta: number, logger?: Logger) {
    this.logger = logger || pino({ name: 'DifferentialPrivacy' });
    this.privacyBudget = {
      epsilon,
      delta,
      spent: 0,
      remaining: epsilon
    };
  }

  /**
   * Add Gaussian noise for differential privacy
   */
  addGaussianNoise(data: number[], sensitivity: number, epsilon: number, delta: number): number[] {
    const sigma = this.calculateGaussianNoiseSigma(sensitivity, epsilon, delta);

    const noisyData = data.map(value => {
      const noise = this.sampleGaussian(0, sigma);
      return value + noise;
    });

    this.updatePrivacyBudget(epsilon);

    this.logger.debug({ sigma, epsilon, delta }, 'Added Gaussian noise');

    return noisyData;
  }

  /**
   * Add Laplace noise for differential privacy
   */
  addLaplaceNoise(data: number[], sensitivity: number, epsilon: number): number[] {
    const scale = sensitivity / epsilon;

    const noisyData = data.map(value => {
      const noise = this.sampleLaplace(scale);
      return value + noise;
    });

    this.updatePrivacyBudget(epsilon);

    this.logger.debug({ scale, epsilon }, 'Added Laplace noise');

    return noisyData;
  }

  /**
   * Gradient clipping for privacy
   */
  clipGradients(gradients: number[], clipNorm: number): number[] {
    const norm = Math.sqrt(gradients.reduce((sum, g) => sum + g * g, 0));

    if (norm > clipNorm) {
      const scale = clipNorm / norm;
      return gradients.map(g => g * scale);
    }

    return gradients;
  }

  /**
   * Apply differentially private aggregation
   */
  privateSumAggregation(
    values: number[][],
    sensitivity: number,
    epsilon: number,
    delta: number
  ): number[] {
    if (values.length === 0) {
      return [];
    }

    // Sum all values
    const sum = values[0].map((_, i) =>
      values.reduce((acc, val) => acc + val[i], 0)
    );

    // Add noise for privacy
    return this.addGaussianNoise(sum, sensitivity, epsilon, delta);
  }

  /**
   * Apply differentially private average
   */
  privateAverageAggregation(
    values: number[][],
    sensitivity: number,
    epsilon: number,
    delta: number
  ): number[] {
    const sum = this.privateSumAggregation(values, sensitivity, epsilon, delta);
    return sum.map(v => v / values.length);
  }

  /**
   * Secure aggregation protocol (placeholder)
   */
  async secureAggregation(
    localUpdates: Map<string, number[]>,
    threshold: number
  ): Promise<number[]> {
    if (localUpdates.size < threshold) {
      throw new Error('Insufficient participants for secure aggregation');
    }

    this.logger.info(
      { participants: localUpdates.size, threshold },
      'Performing secure aggregation'
    );

    // In a real implementation, this would:
    // 1. Use multi-party computation (MPC)
    // 2. Encrypt individual updates
    // 3. Aggregate encrypted values
    // 4. Decrypt only the aggregate result

    const allValues = Array.from(localUpdates.values());
    const aggregated = allValues[0].map((_, i) =>
      allValues.reduce((sum, val) => sum + val[i], 0) / allValues.length
    );

    return aggregated;
  }

  /**
   * Calculate Gaussian noise sigma
   */
  private calculateGaussianNoiseSigma(
    sensitivity: number,
    epsilon: number,
    delta: number
  ): number {
    // Gaussian mechanism: σ = (sensitivity * sqrt(2 * ln(1.25/δ))) / ε
    return (sensitivity * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon;
  }

  /**
   * Sample from Gaussian distribution using Box-Muller transform
   */
  private sampleGaussian(mean: number, sigma: number): number {
    const u1 = Math.random();
    const u2 = Math.random();

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + sigma * z0;
  }

  /**
   * Sample from Laplace distribution
   */
  private sampleLaplace(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Update privacy budget
   */
  private updatePrivacyBudget(epsilon: number): void {
    this.privacyBudget.spent += epsilon;
    this.privacyBudget.remaining = this.privacyBudget.epsilon - this.privacyBudget.spent;

    if (this.privacyBudget.remaining < 0) {
      this.logger.warn('Privacy budget exceeded!');
    }
  }

  /**
   * Get privacy budget status
   */
  getPrivacyBudget(): PrivacyBudget {
    return { ...this.privacyBudget };
  }

  /**
   * Check if privacy budget allows operation
   */
  canAffordOperation(epsilon: number): boolean {
    return this.privacyBudget.remaining >= epsilon;
  }

  /**
   * Reset privacy budget
   */
  resetBudget(): void {
    this.privacyBudget.spent = 0;
    this.privacyBudget.remaining = this.privacyBudget.epsilon;
    this.logger.info('Privacy budget reset');
  }

  /**
   * Calculate privacy loss for composition
   */
  calculateComposedPrivacy(operations: Array<{ epsilon: number; delta: number }>): {
    totalEpsilon: number;
    totalDelta: number;
  } {
    // Simple composition (worst case)
    const totalEpsilon = operations.reduce((sum, op) => sum + op.epsilon, 0);
    const totalDelta = operations.reduce((sum, op) => sum + op.delta, 0);

    return { totalEpsilon, totalDelta };
  }

  /**
   * Advanced composition using moments accountant
   */
  calculateAdvancedComposition(
    singleStepEpsilon: number,
    singleStepDelta: number,
    numSteps: number,
    targetDelta: number
  ): number {
    // Simplified advanced composition
    // In real implementation, use RDP (Rényi Differential Privacy) composition
    const factor = Math.sqrt(2 * numSteps * Math.log(1 / targetDelta));
    return singleStepEpsilon * factor;
  }
}
