/**
 * Laplacian Mechanism for Differential Privacy
 * Implements ε-differential privacy with Laplacian noise
 */

import { NoiseParameters } from '../types.js';

export class LaplacianMechanism {
  /**
   * Add Laplacian noise to achieve ε-differential privacy
   */
  addNoise(value: number | number[], params: NoiseParameters): number | number[] {
    if (!params.epsilon) {
      throw new Error('Laplacian mechanism requires epsilon');
    }

    const scale = params.sensitivity / params.epsilon;

    if (Array.isArray(value)) {
      return value.map((v) => v + this.sampleLaplacian(0, scale));
    } else {
      return value + this.sampleLaplacian(0, scale);
    }
  }

  /**
   * Sample from Laplacian distribution
   */
  private sampleLaplacian(location: number, scale: number): number {
    const u = Math.random() - 0.5;
    return location - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Calculate privacy loss for given parameters
   */
  calculatePrivacyLoss(sensitivity: number, epsilon: number): { epsilon: number } {
    return { epsilon };
  }

  /**
   * Compute sensitivity for a given query
   */
  computeSensitivity(
    queryType: 'count' | 'sum' | 'histogram' | 'median',
    dataRange?: [number, number]
  ): number {
    switch (queryType) {
      case 'count':
        return 1;

      case 'sum':
        if (!dataRange) {
          throw new Error('Data range required for sum query sensitivity');
        }
        return Math.max(Math.abs(dataRange[0]), Math.abs(dataRange[1]));

      case 'histogram':
        return 1; // Single record can affect at most one bin

      case 'median':
        if (!dataRange) {
          throw new Error('Data range required for median query sensitivity');
        }
        return dataRange[1] - dataRange[0];

      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }

  /**
   * Compose privacy guarantees using basic composition
   */
  composePrivacy(epsilons: number[]): number {
    return epsilons.reduce((sum, eps) => sum + eps, 0);
  }

  /**
   * Compose privacy using advanced composition theorem
   */
  advancedComposition(epsilon: number, k: number, delta: number): number {
    // Advanced composition: ε' = sqrt(2k * ln(1/δ)) * ε + k * ε^2
    return Math.sqrt(2 * k * Math.log(1 / delta)) * epsilon + k * epsilon * epsilon;
  }

  /**
   * Calibrate noise for target epsilon
   */
  calibrateNoise(
    targetEpsilon: number,
    sensitivity: number
  ): { epsilon: number; scale: number } {
    const scale = sensitivity / targetEpsilon;
    return { epsilon: targetEpsilon, scale };
  }
}
