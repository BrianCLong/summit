/**
 * Private Gradient Descent with Differential Privacy
 * Implements DP-SGD algorithm
 */

import { GaussianMechanism } from '@intelgraph/differential-privacy';

export interface DPSGDConfig {
  learningRate: number;
  clippingNorm: number;
  noiseMultiplier: number;
  batchSize: number;
  epochs: number;
  targetEpsilon: number;
  targetDelta: number;
}

export class PrivateGradientDescent {
  private gaussian: GaussianMechanism;

  constructor() {
    this.gaussian = new GaussianMechanism();
  }

  /**
   * Clip gradients to bound sensitivity
   */
  clipGradients(gradients: number[], clippingNorm: number): number[] {
    const norm = Math.sqrt(gradients.reduce((sum, g) => sum + g * g, 0));

    if (norm > clippingNorm) {
      return gradients.map((g) => (g * clippingNorm) / norm);
    }

    return gradients;
  }

  /**
   * Add calibrated noise to gradients
   */
  addNoise(gradients: number[], config: DPSGDConfig): number[] {
    const noiseScale = config.noiseMultiplier * config.clippingNorm;

    return gradients.map((g) => {
      const noise = this.sampleGaussian(0, noiseScale);
      return g + noise;
    });
  }

  /**
   * Private gradient descent step
   */
  privateSGDStep(
    gradients: number[][],
    config: DPSGDConfig
  ): number[] {
    // Clip each gradient
    const clippedGradients = gradients.map((g) =>
      this.clipGradients(g, config.clippingNorm)
    );

    // Average gradients
    const dims = clippedGradients[0].length;
    const avgGradient = new Array(dims).fill(0);

    for (const g of clippedGradients) {
      for (let i = 0; i < dims; i++) {
        avgGradient[i] += g[i] / clippedGradients.length;
      }
    }

    // Add noise
    return this.addNoise(avgGradient, config);
  }

  private sampleGaussian(mean: number, stddev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
