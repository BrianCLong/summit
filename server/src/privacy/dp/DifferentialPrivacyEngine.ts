
import { logger } from '../../config/logger.js';

export interface DpConfig {
  epsilon: number; // Privacy budget
  sensitivity: number; // L1 sensitivity of the query
}

/**
 * Core Differential Privacy Engine (Task #101).
 * Implements Laplace noise injection for privacy-preserving analytics.
 */
export class DifferentialPrivacyEngine {
  private static instance: DifferentialPrivacyEngine;

  private constructor() {}

  public static getInstance(): DifferentialPrivacyEngine {
    if (!DifferentialPrivacyEngine.instance) {
      DifferentialPrivacyEngine.instance = new DifferentialPrivacyEngine();
    }
    return DifferentialPrivacyEngine.instance;
  }

  /**
   * Generates Laplace noise based on epsilon and sensitivity.
   */
  public generateLaplaceNoise(epsilon: number, sensitivity: number): number {
    const scale = sensitivity / epsilon;
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Applies DP to a numeric aggregate (e.g. count, sum).
   */
  public privatizeAggregate(value: number, config: Partial<DpConfig> = {}): number {
    const epsilon = config.epsilon || 0.1; // Stricter default
    const sensitivity = config.sensitivity || 1.0; // Assume unit sensitivity for counts

    const noise = this.generateLaplaceNoise(epsilon, sensitivity);
    const privatizedValue = value + noise;

    logger.debug({ original: value, privatized: privatizedValue, epsilon }, 'DP: Aggregate privatized');
    
    // Ensure counts don't go negative
    return Math.max(0, privatizedValue);
  }

  /**
   * K-Anonymity check for small buckets.
   */
  public enforceKAnonymity(count: number, k: number = 5): number | null {
    if (count < k) {
      logger.warn({ count, k }, 'DP: Bucket size below K threshold, suppressing');
      return null;
    }
    return count;
  }
}

export const dpEngine = DifferentialPrivacyEngine.getInstance();
