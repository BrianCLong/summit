
import { RollbackEngine } from './rollback-engine';
import { MultiRegionProber } from './multi-region-prober';
import { rollbackEventsTotal } from '../../monitoring/metrics.js';

export interface RollbackTriggerConfig {
  errorRateThreshold: number; // e.g. 0.05 for 5%
  latencyThresholdMs: number;
  consecutiveFailures: number;
}

export class AutoRollbackMonitor {
  private rollbackEngine: RollbackEngine;
  private prober: MultiRegionProber;
  private config: RollbackTriggerConfig;
  private failureCounter: number = 0;
  private serviceName: string;

  constructor(
    serviceName: string,
    rollbackEngine: RollbackEngine,
    prober: MultiRegionProber,
    config: RollbackTriggerConfig
  ) {
    this.serviceName = serviceName;
    this.rollbackEngine = rollbackEngine;
    this.prober = prober;
    this.config = config;
  }

  /**
   * Checks health and triggers rollback if necessary.
   * intended to be called periodically.
   */
  public async checkAndTrigger(): Promise<boolean> {
    const statuses = await this.prober.probeAll();

    // Simple logic: if ALL regions are unhealthy or high latency, we might have a bad deploy.
    // Or if the "primary" region (first one) is bad.
    // Let's assume we care about global health.

    const unhealthyCount = statuses.filter(s => !s.isHealthy).length;
    const highLatencyCount = statuses.filter(s => s.isHealthy && s.latencyMs > this.config.latencyThresholdMs).length;

    const totalIssues = unhealthyCount + highLatencyCount;
    const totalRegions = statuses.length;

    // If more than 50% of regions are having issues, increment counter
    if (totalRegions > 0 && (totalIssues / totalRegions) > 0.5) {
      this.failureCounter++;
      console.log(`[AutoRollback] Health check failed (${this.failureCounter}/${this.config.consecutiveFailures}). Issues: ${totalIssues}/${totalRegions}`);
    } else {
      this.failureCounter = 0;
    }

    if (this.failureCounter >= this.config.consecutiveFailures) {
      console.warn(`[AutoRollback] Threshold reached. Triggering rollback for ${this.serviceName}.`);

      // Update Prometheus metrics
      rollbackEventsTotal.inc({ service: this.serviceName, reason: 'health_check_failed' });

      await this.rollbackEngine.performRollback({
        serviceName: this.serviceName,
        reason: `Automatic Rollback: Health check failed for ${this.failureCounter} consecutive checks.`,
        migrationSteps: 0 // Default, maybe configurable
      });
      this.failureCounter = 0; // Reset after trigger
      return true;
    }

    return false;
  }
}
