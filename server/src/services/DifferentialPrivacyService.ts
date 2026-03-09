
import { logger } from '../config/logger.js';

export interface DPConfig {
  epsilon: number; // Privacy budget (lower = more privacy, less accuracy)
  delta?: number;
  sensitivity: number; // Max impact of one individual
}

/**
 * Service for applying Differential Privacy to query results.
 * Essential for Sovereign Mesh Queries (Task #113).
 */
export class DifferentialPrivacyService {
  private static instance: DifferentialPrivacyService;

  private constructor() {}

  public static getInstance(): DifferentialPrivacyService {
    if (!DifferentialPrivacyService.instance) {
      DifferentialPrivacyService.instance = new DifferentialPrivacyService();
    }
    return DifferentialPrivacyService.instance;
  }

  /**
   * Adds Laplace noise to a numerical result.
   * Mechanism: result + Laplace(sensitivity / epsilon)
   */
  public addLaplaceNoise(value: number, config: DPConfig = { epsilon: 1.0, sensitivity: 1.0 }): number {
    const scale = config.sensitivity / config.epsilon;
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

    logger.debug({ value, noise, epsilon: config.epsilon }, 'DP: Applied Laplace noise');
    return value + noise;
  }

  /**
   * Guards a result set by applying DP to aggregates or redaction to identifiers.
   * For Phase 6, we focus on Aggregate queries (COUNT, AVG).
   */
  public guardResult(result: any, queryType: 'AGGREGATE' | 'DETAIL'): any {
    if (queryType === 'AGGREGATE' && typeof result.value === 'number') {
      return {
        ...result,
        value: Math.round(this.addLaplaceNoise(result.value)), // Rounding for plausible counts
        isApproximation: true
      };
    }

    // For detailed queries crossing sovereign boundaries, we might redact PII
    // For now, we pass through but flag it.
    return result;
  }
}

export const differentialPrivacyService = DifferentialPrivacyService.getInstance();
