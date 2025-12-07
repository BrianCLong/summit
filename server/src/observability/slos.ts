/**
 * SLO Monitoring and Enforcement Service
 * Defines and monitors Service Level Objectives for critical components.
 */

import { register, Gauge } from 'prom-client';
import logger from '../utils/logger.js';
import { slowQueryKiller } from './slow-query-killer.js';
import { metrics } from './metrics.js';

// SLO Configuration
export interface SLOConfig {
  name: string;
  description: string;
  target: number; // Percentage (e.g., 99.9)
  window: string; // Time window (e.g., '24h', '7d')
  metric: string; // Prometheus metric name
  threshold: number; // Threshold for the metric (e.g., latency < 500ms)
  alertChannel?: string;
}

// Define Core SLOs
export const CORE_SLOS: SLOConfig[] = [
  {
    name: 'graph_core_availability',
    description: 'Graph Core API Availability',
    target: 99.9,
    window: '24h',
    metric: 'graphql_requests_total',
    threshold: 0, // Errors / Total < 0.1%
  },
  {
    name: 'graph_core_latency',
    description: 'Graph Core API Latency (p95)',
    target: 99.0, // 99% of requests within threshold
    window: '24h',
    metric: 'graphql_request_duration_seconds',
    threshold: 0.5, // 500ms
  },
  {
    name: 'ingestion_reliability',
    description: 'Ingestion Pipeline Reliability',
    target: 99.9,
    window: '24h',
    metric: 'intelgraph_jobs_processed_total',
    threshold: 0, // Failure rate < 0.1%
  },
  {
    name: 'analytics_latency',
    description: 'Analytics Query Latency (p95)',
    target: 99.5,
    window: '24h',
    metric: 'graph_operation_duration_seconds',
    threshold: 5.0, // 5s
  },
  {
    name: 'copilot_latency',
    description: 'Copilot Response Latency (p95)',
    target: 99.0,
    window: '24h',
    metric: 'copilot_api_request_duration_ms',
    threshold: 2000, // 2s
  },
];

// Prometheus Metrics for SLOs
const sloStatusGauge = new Gauge({
  name: 'slo_status_compliance',
  help: 'Current compliance status of an SLO (1 = compliant, 0 = violation)',
  labelNames: ['slo_name', 'window'],
});

const sloErrorBudgetGauge = new Gauge({
  name: 'slo_error_budget_remaining',
  help: 'Remaining error budget for an SLO (0-100 percentage)',
  labelNames: ['slo_name', 'window'],
});

register.registerMetric(sloStatusGauge);
register.registerMetric(sloErrorBudgetGauge);

export class SLOService {
  private slos: Map<string, SLOConfig>;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  constructor() {
    this.slos = new Map(CORE_SLOS.map(slo => [slo.name, slo]));
    this.startMonitoring();
  }

  /**
   * Start periodic SLO monitoring
   */
  public startMonitoring() {
    if (this.checkInterval) return;

    logger.info('Starting SLO monitoring service...');
    this.checkInterval = setInterval(() => {
      this.evaluateSLOs();
    }, this.CHECK_INTERVAL_MS);

    // Initial evaluation
    this.evaluateSLOs();
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Evaluate all SLOs
   */
  private async evaluateSLOs() {
    for (const slo of this.slos.values()) {
      try {
        const compliance = await this.checkSLOCompliance(slo);

        // Update metrics
        sloStatusGauge.set(
          { slo_name: slo.name, window: slo.window },
          compliance.compliant ? 1 : 0
        );

        sloErrorBudgetGauge.set(
          { slo_name: slo.name, window: slo.window },
          compliance.remainingBudget
        );

        if (!compliance.compliant) {
          logger.warn({
            msg: 'SLO Violation Detected',
            slo: slo.name,
            current: compliance.currentValue,
            target: slo.target,
            budget: compliance.remainingBudget
          });
        }
      } catch (error) {
        logger.error({
          msg: 'Error evaluating SLO',
          slo: slo.name,
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * Check compliance for a specific SLO
   * Note: In a real system, this would query Prometheus.
   * Here we simulate based on in-memory metrics or available stats.
   */
  private async checkSLOCompliance(slo: SLOConfig): Promise<{
    compliant: boolean;
    currentValue: number;
    remainingBudget: number;
  }> {
    // SIMULATION: In a real env, use prom-client to query the actual metric values
    // For now, we'll return mock data or derive from in-memory metrics if possible.

    // Mock logic for demonstration
    const randomFluctuation = Math.random() * 0.5;
    const currentValue = slo.target + randomFluctuation; // Mostly compliant
    const remainingBudget = Math.max(0, 100 - (100 - currentValue) / (100 - slo.target) * 100);

    return {
      compliant: currentValue >= slo.target,
      currentValue,
      remainingBudget
    };
  }

  /**
   * Get current status of all SLOs
   */
  public async getSLOStatus() {
    const status = [];
    for (const slo of this.slos.values()) {
      const result = await this.checkSLOCompliance(slo);
      status.push({
        ...slo,
        ...result
      });
    }
    return status;
  }
}

// Singleton instance
export const sloService = new SLOService();
