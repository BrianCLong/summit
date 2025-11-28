import { ROIMetrics } from './types.js';
import { PrometheusMetrics } from '../utils/metrics.js';

export class ROITelemetry {
  private static instance: ROITelemetry;
  private promMetrics: PrometheusMetrics;
  private metrics: ROIMetrics = {
    velocityGain: 0,
    contextSwitchesReduced: 0,
    complianceScore: 100,
    tasksCompleted: 0,
    uptime: 100,
  };

  private constructor() {
    this.promMetrics = new PrometheusMetrics('summit_qaf'); // Namespace matches dashboard prefix

    // Initialize Prometheus definitions
    this.promMetrics.createGauge('velocity_gain', 'Percentage gain in development velocity');
    this.promMetrics.createGauge('context_switch_reduction', 'Percentage reduction in context switches');
    this.promMetrics.createGauge('compliance_score', 'Current compliance score (0-100)');
    this.promMetrics.createCounter('tasks_completed', 'Total number of agent tasks completed');
    this.promMetrics.createGauge('secure_agents', 'Number of quantum-secure agents');
    this.promMetrics.createGauge('total_agents', 'Total number of active agents');
  }

  public static getInstance(): ROITelemetry {
    if (!ROITelemetry.instance) {
      ROITelemetry.instance = new ROITelemetry();
    }
    return ROITelemetry.instance;
  }

  public recordTaskCompletion(durationMs: number, success: boolean) {
    this.metrics.tasksCompleted++;
    this.promMetrics.incrementCounter('tasks_completed');

    // Simulate velocity gain calculation
    this.metrics.velocityGain = Math.min(15, this.metrics.velocityGain + 0.1);
    this.promMetrics.setGauge('velocity_gain', this.metrics.velocityGain);
  }

  public updateContextSwitches(reduction: number) {
    this.metrics.contextSwitchesReduced = reduction;
    this.promMetrics.setGauge('context_switch_reduction', reduction);
  }

  public recordComplianceCheck(passed: boolean) {
    if (!passed) {
      this.metrics.complianceScore = Math.max(0, this.metrics.complianceScore - 5);
    } else {
      this.metrics.complianceScore = Math.min(100, this.metrics.complianceScore + 1);
    }
    this.promMetrics.setGauge('compliance_score', this.metrics.complianceScore);
  }

  public updateAgentCounts(total: number, secure: number) {
      this.promMetrics.setGauge('total_agents', total);
      this.promMetrics.setGauge('secure_agents', secure);
  }

  public getMetrics(): ROIMetrics {
    return { ...this.metrics };
  }

  public async generateReport(): Promise<string> {
    return JSON.stringify(this.metrics, null, 2);
  }
}
