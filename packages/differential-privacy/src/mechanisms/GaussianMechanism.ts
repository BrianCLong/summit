/**
 * Gaussian Mechanism for Differential Privacy
 * Implements (ε, δ)-differential privacy with Gaussian noise
 */

import { NoiseParameters } from '../types.js';

export class GaussianMechanism {
  /**
   * Add Gaussian noise to achieve (ε, δ)-differential privacy
   */
  addNoise(value: number | number[], params: NoiseParameters): number | number[] {
    if (!params.epsilon || !params.delta) {
      throw new Error('Gaussian mechanism requires both epsilon and delta');
    }

    const scale = this.calculateNoiseScale(
      params.sensitivity,
      params.epsilon,
      params.delta
    );

    if (Array.isArray(value)) {
      return value.map((v) => v + this.sampleGaussian(0, scale));
    } else {
      return value + this.sampleGaussian(0, scale);
    }
  }

  /**
   * Calculate noise scale (standard deviation) for Gaussian mechanism
   * σ = sqrt(2 * ln(1.25/δ)) * Δf / ε
   */
  calculateNoiseScale(sensitivity: number, epsilon: number, delta: number): number {
    return (Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity) / epsilon;
  }

  /**
   * Sample from Gaussian distribution using Box-Muller transform
   */
  private sampleGaussian(mean: number, stddev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    return mean + z0 * stddev;
  }

  /**
   * Calculate privacy loss for given parameters
   */
  calculatePrivacyLoss(
    sensitivity: number,
    epsilon: number,
    delta: number
  ): { epsilon: number; delta: number } {
    return { epsilon, delta };
  }

  /**
   * Compute sensitivity for a given query
   */
  computeSensitivity(
    queryType: 'count' | 'sum' | 'mean' | 'variance',
    dataRange?: [number, number],
    dataSize?: number
  ): number {
    switch (queryType) {
      case 'count':
        return 1;

      case 'sum':
        if (!dataRange) {
          throw new Error('Data range required for sum query sensitivity');
        }
        return Math.max(Math.abs(dataRange[0]), Math.abs(dataRange[1]));

      case 'mean':
        if (!dataRange || !dataSize) {
          throw new Error('Data range and size required for mean query sensitivity');
        }
        const maxValue = Math.max(Math.abs(dataRange[0]), Math.abs(dataRange[1]));
        return maxValue / dataSize;

      case 'variance':
        if (!dataRange || !dataSize) {
          throw new Error('Data range and size required for variance query sensitivity');
        }
        const range = dataRange[1] - dataRange[0];
        return (range * range) / dataSize;

      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }

  /**
   * Calibrate noise for privacy-utility tradeoff
   */
  calibrateNoise(
    targetEpsilon: number,
    targetDelta: number,
    sensitivity: number,
    utilityConstraint: number
  ): { epsilon: number; delta: number; scale: number } {
    let epsilon = targetEpsilon;
    let delta = targetDelta;

    // Adjust epsilon to meet utility constraint
    let scale = this.calculateNoiseScale(sensitivity, epsilon, delta);

    while (scale > utilityConstraint && epsilon < 10) {
      epsilon *= 1.1;
      scale = this.calculateNoiseScale(sensitivity, epsilon, delta);
    }

    return { epsilon, delta, scale };
  }
}
