
import { logger } from '../../config/logger.js';
import { dpEngine } from './DifferentialPrivacyEngine.js';

export interface MLTrainingConfig {
  noiseMultiplier: number;
  l2NormClip: number;
  batchSize: number;
}

/**
 * Utility for Privacy-Preserving Machine Learning (Task #101).
 * Implements logic for adding DP noise to gradients (simulated DP-SGD).
 */
export class PrivacyPreservingML {
  private static instance: PrivacyPreservingML;

  private constructor() {}

  public static getInstance(): PrivacyPreservingML {
    if (!PrivacyPreservingML.instance) {
      PrivacyPreservingML.instance = new PrivacyPreservingML();
    }
    return PrivacyPreservingML.instance;
  }

  /**
   * Applies differential privacy noise to a set of gradients.
   * This is a simulated implementation of DP-SGD gradient clipping and noise addition.
   */
  public privatizeGradients(gradients: number[], config: MLTrainingConfig): number[] {
    logger.info({ size: gradients.length }, 'ML-Privacy: Privatizing gradients');

    // 1. Clip gradients to bound sensitivity
    const clippedGradients = this.clipGradients(gradients, config.l2NormClip);

    // 2. Add Gaussian/Laplace noise
    const epsilon = 1.0 / config.noiseMultiplier; // Inverse relationship
    const privatized = clippedGradients.map(g =>
      g + dpEngine.generateLaplaceNoise(epsilon, config.l2NormClip / config.batchSize)
    );

    logger.debug('ML-Privacy: Noise added to gradients');
    return privatized;
  }

  /**
   * Bounds the L2 norm of the gradients.
   */
  private clipGradients(gradients: number[], maxNorm: number): number[] {
    const l2Norm = Math.sqrt(gradients.reduce((sum, g) => sum + g * g, 0));
    const factor = Math.min(1, maxNorm / (l2Norm + 1e-6));

    return gradients.map(g => g * factor);
  }
}

export const privacyPreservingML = PrivacyPreservingML.getInstance();
