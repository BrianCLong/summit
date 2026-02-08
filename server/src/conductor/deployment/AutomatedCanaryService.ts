
import { logger } from '../../config/logger.js';
import { HealthMetrics } from './blue-green.js';

export interface CanaryResult {
  score: number; // 0 to 100, where 100 is perfect
  decision: 'PROMOTE' | 'ROLLBACK' | 'CONTINUE';
  reason: string;
  metrics: {
    errorRateAnomalous: boolean;
    latencyAnomalous: boolean;
    throughputDrop: boolean;
  };
}

/**
 * Service for sophisticated Canary Analysis.
 * Simulates ML-driven anomaly detection by comparing canary metrics 
 * against historical baselines and current production metrics.
 */
export class AutomatedCanaryService {
  private static instance: AutomatedCanaryService;
  
  // Historical baseline (simulated)
  private baseline = {
    errorRate: 0.005, // 0.5%
    latencyP95: 150, // 150ms
  };

  private constructor() {}

  public static getInstance(): AutomatedCanaryService {
    if (!AutomatedCanaryService.instance) {
      AutomatedCanaryService.instance = new AutomatedCanaryService();
    }
    return AutomatedCanaryService.instance;
  }

  /**
   * Evaluates canary health using "ML-driven" logic.
   * Compares current metrics against baseline and production.
   */
  public async analyze(
    canaryMetrics: HealthMetrics, 
    productionMetrics: HealthMetrics
  ): Promise<CanaryResult> {
    logger.info({ canaryMetrics, productionMetrics }, 'ACA: Starting automated analysis');

    const metrics = {
      errorRateAnomalous: this.isAnomalous(canaryMetrics.errorRate, productionMetrics.errorRate, 0.01),
      latencyAnomalous: this.isAnomalous(canaryMetrics.latencyP95, productionMetrics.latencyP95, 50),
      throughputDrop: canaryMetrics.throughput < (productionMetrics.throughput * 0.8) && canaryMetrics.activeConnections > 0
    };

    let score = 100;
    const reasons: string[] = [];

    if (metrics.errorRateAnomalous) {
      score -= 40;
      reasons.push('Error rate significantly higher than production');
    }

    if (metrics.latencyAnomalous) {
      score -= 30;
      reasons.push('P95 latency degradation detected');
    }

    if (metrics.throughputDrop) {
      score -= 20;
      reasons.push('Throughput drop relative to connection count');
    }

    let decision: CanaryResult['decision'] = 'CONTINUE';
    if (score < 60) {
      decision = 'ROLLBACK';
    } else if (score >= 90) {
      decision = 'PROMOTE';
    }

    const result: CanaryResult = {
      score,
      decision,
      reason: reasons.length > 0 ? reasons.join('; ') : 'All metrics within acceptable bounds',
      metrics
    };

    logger.info(result, 'ACA: Analysis complete');
    return result;
  }

  /**
   * Simulated anomaly detection logic (Z-score like)
   */
  private isAnomalous(value: number, baseline: number, threshold: number): boolean {
    // If value is more than 'threshold' units above baseline, mark as anomalous
    return value > (baseline + threshold);
  }
}

export const automatedCanaryService = AutomatedCanaryService.getInstance();
