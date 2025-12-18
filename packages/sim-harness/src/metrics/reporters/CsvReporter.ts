/**
 * CSV Reporter - Generates CSV reports for spreadsheet analysis
 */

import type { EvaluationReport } from '../../types/index.js';

export class CsvReporter {
  /**
   * Generate CSV report
   */
  generate(report: EvaluationReport): string {
    const lines: string[] = [];

    // Header
    lines.push('# IntelGraph Evaluation Report');
    lines.push(`# Scenario: ${report.scenarioName} (${report.scenarioId})`);
    lines.push(`# Generated: ${report.timestamp}`);
    lines.push('');

    // Aggregate metrics
    lines.push('## Aggregate Metrics');
    lines.push('Metric,Value,Unit');
    lines.push(
      `Avg Duration,${(report.aggregateMetrics.performance.avgDuration / 1000).toFixed(2)},seconds`,
    );
    lines.push(
      `Query Latency (p50),${report.aggregateMetrics.performance.avgQueryLatency.p50.toFixed(0)},ms`,
    );
    lines.push(
      `Query Latency (p95),${report.aggregateMetrics.performance.avgQueryLatency.p95.toFixed(0)},ms`,
    );
    lines.push(
      `Query Latency (p99),${report.aggregateMetrics.performance.avgQueryLatency.p99.toFixed(0)},ms`,
    );
    lines.push(
      `Time to First Insight,${(report.aggregateMetrics.performance.avgTimeToInsight / 1000).toFixed(2)},seconds`,
    );
    lines.push(
      `Entities Found Rate,${(report.aggregateMetrics.correctness.entitiesFoundRate * 100).toFixed(1)},%`,
    );
    lines.push(
      `Relationships Found Rate,${(report.aggregateMetrics.correctness.relationshipsFoundRate * 100).toFixed(1)},%`,
    );
    lines.push(
      `False Negative Rate,${(report.aggregateMetrics.correctness.falseNegativeRate * 100).toFixed(1)},%`,
    );
    lines.push(
      `Success Rate,${(report.aggregateMetrics.reliability.successRate * 100).toFixed(1)},%`,
    );
    lines.push(
      `Error Rate,${(report.aggregateMetrics.reliability.errorRate * 100).toFixed(1)},%`,
    );
    lines.push('');

    // Session details
    lines.push('## Session Details');
    lines.push(
      'Session ID,Status,Duration (s),Queries,Entities Found,Relationships Found,Errors',
    );
    for (const session of report.sessions) {
      lines.push(
        [
          session.id,
          session.status,
          (session.metrics.totalDuration / 1000).toFixed(2),
          session.metrics.queriesIssued,
          session.metrics.entitiesFound,
          session.metrics.relationshipsFound,
          session.metrics.errorCount,
        ].join(','),
      );
    }
    lines.push('');

    // Comparison if available
    if (report.comparison) {
      lines.push('## Version Comparison');
      lines.push(
        `Baseline Version: ${report.comparison.baseline.version}`,
      );
      lines.push(
        `Candidate Version: ${report.comparison.candidate.version}`,
      );
      lines.push('');
      lines.push('Metric,Baseline,Candidate,Delta (%)');

      const comp = report.comparison;
      lines.push(
        `Avg Duration,${(comp.baseline.metrics.performance.avgDuration / 1000).toFixed(2)},${(comp.candidate.metrics.performance.avgDuration / 1000).toFixed(2)},${comp.deltas.performance.avgDuration.toFixed(1)}`,
      );
      lines.push(
        `Query Latency (p50),${comp.baseline.metrics.performance.avgQueryLatency.p50.toFixed(0)},${comp.candidate.metrics.performance.avgQueryLatency.p50.toFixed(0)},${comp.deltas.performance.avgQueryLatency_p50.toFixed(1)}`,
      );
      lines.push(
        `Entities Found Rate,${(comp.baseline.metrics.correctness.entitiesFoundRate * 100).toFixed(1)},${(comp.candidate.metrics.correctness.entitiesFoundRate * 100).toFixed(1)},${comp.deltas.correctness.entitiesFoundRate.toFixed(1)}`,
      );
      lines.push(
        `Success Rate,${(comp.baseline.metrics.reliability.successRate * 100).toFixed(1)},${(comp.candidate.metrics.reliability.successRate * 100).toFixed(1)},${comp.deltas.reliability.successRate.toFixed(1)}`,
      );
    }

    return lines.join('\n');
  }
}
