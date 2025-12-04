/**
 * HTML Reporter - Generates interactive HTML reports
 */

import type { EvaluationReport } from '../../types/index.js';

export class HtmlReporter {
  /**
   * Generate HTML report
   */
  generate(report: EvaluationReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IntelGraph Evaluation Report - ${report.scenarioName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; margin-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h3 { color: #7f8c8d; margin-top: 20px; margin-bottom: 10px; }
    .meta { color: #7f8c8d; margin-bottom: 20px; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric-card {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #3498db;
    }
    .metric-card.success { border-left-color: #2ecc71; }
    .metric-card.warning { border-left-color: #f39c12; }
    .metric-card.error { border-left-color: #e74c3c; }
    .metric-label { font-size: 0.9em; color: #7f8c8d; margin-bottom: 5px; }
    .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
    .metric-unit { font-size: 0.5em; color: #95a5a6; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
    th { background: #34495e; color: white; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .status-completed { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    .status-timeout { background: #fff3cd; color: #856404; }
    .delta-positive { color: #2ecc71; }
    .delta-negative { color: #e74c3c; }
    .delta-neutral { color: #95a5a6; }
    .comparison-table { margin-top: 20px; }
    .comparison-table td:nth-child(3) { font-weight: bold; }
    pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px; overflow-x: auto; }
    code { font-family: 'Monaco', 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>IntelGraph Evaluation Report</h1>
    <div class="meta">
      <strong>Scenario:</strong> ${report.scenarioName} (${report.scenarioId})<br>
      <strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}<br>
      <strong>Sessions:</strong> ${report.sessions.length}
    </div>

    <h2>Performance Metrics</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Avg Duration</div>
        <div class="metric-value">
          ${(report.aggregateMetrics.performance.avgDuration / 1000).toFixed(2)}
          <span class="metric-unit">sec</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Query Latency (p50)</div>
        <div class="metric-value">
          ${report.aggregateMetrics.performance.avgQueryLatency.p50.toFixed(0)}
          <span class="metric-unit">ms</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Query Latency (p95)</div>
        <div class="metric-value">
          ${report.aggregateMetrics.performance.avgQueryLatency.p95.toFixed(0)}
          <span class="metric-unit">ms</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Time to First Insight</div>
        <div class="metric-value">
          ${(report.aggregateMetrics.performance.avgTimeToInsight / 1000).toFixed(2)}
          <span class="metric-unit">sec</span>
        </div>
      </div>
    </div>

    <h2>Correctness Metrics</h2>
    <div class="metric-grid">
      <div class="metric-card ${this.getCorrectnessClass(report.aggregateMetrics.correctness.entitiesFoundRate)}">
        <div class="metric-label">Entities Found Rate</div>
        <div class="metric-value">
          ${(report.aggregateMetrics.correctness.entitiesFoundRate * 100).toFixed(1)}
          <span class="metric-unit">%</span>
        </div>
      </div>
      <div class="metric-card ${this.getCorrectnessClass(report.aggregateMetrics.correctness.relationshipsFoundRate)}">
        <div class="metric-label">Relationships Found Rate</div>
        <div class="metric-value">
          ${(report.aggregateMetrics.correctness.relationshipsFoundRate * 100).toFixed(1)}
          <span class="metric-unit">%</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">False Negative Rate</div>
        <div class="metric-value">
          ${(report.aggregateMetrics.correctness.falseNegativeRate * 100).toFixed(1)}
          <span class="metric-unit">%</span>
        </div>
      </div>
    </div>

    <h2>Reliability Metrics</h2>
    <div class="metric-grid">
      <div class="metric-card ${this.getReliabilityClass(report.aggregateMetrics.reliability.successRate)}">
        <div class="metric-label">Success Rate</div>
        <div class="metric-value">
          ${(report.aggregateMetrics.reliability.successRate * 100).toFixed(1)}
          <span class="metric-unit">%</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Error Rate</div>
        <div class="metric-value">
          ${(report.aggregateMetrics.reliability.errorRate * 100).toFixed(1)}
          <span class="metric-unit">%</span>
        </div>
      </div>
    </div>

    ${this.renderComparison(report)}

    <h2>Session Details</h2>
    <table>
      <thead>
        <tr>
          <th>Session ID</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Queries</th>
          <th>Entities</th>
          <th>Errors</th>
        </tr>
      </thead>
      <tbody>
        ${report.sessions
          .map(
            (s) => `
          <tr>
            <td><code>${s.id.substring(0, 12)}</code></td>
            <td><span class="status-badge status-${s.status}">${s.status}</span></td>
            <td>${(s.metrics.totalDuration / 1000).toFixed(2)}s</td>
            <td>${s.metrics.queriesIssued}</td>
            <td>${s.metrics.entitiesFound}</td>
            <td>${s.metrics.errorCount}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>

    <h2>Raw Data (JSON)</h2>
    <pre><code>${JSON.stringify(report, null, 2)}</code></pre>
  </div>
</body>
</html>
    `.trim();
  }

  private getCorrectnessClass(rate: number): string {
    if (rate >= 0.9) return 'success';
    if (rate >= 0.7) return 'warning';
    return 'error';
  }

  private getReliabilityClass(rate: number): string {
    if (rate >= 0.95) return 'success';
    if (rate >= 0.8) return 'warning';
    return 'error';
  }

  private renderComparison(report: EvaluationReport): string {
    if (!report.comparison) {
      return '';
    }

    const comp = report.comparison;

    return `
      <h2>Version Comparison</h2>
      <p>
        <strong>Baseline:</strong> ${comp.baseline.version} &nbsp;&nbsp;
        <strong>Candidate:</strong> ${comp.candidate.version}
      </p>
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Baseline</th>
            <th>Candidate</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          ${this.renderComparisonRow(
            'Avg Duration',
            comp.baseline.metrics.performance.avgDuration / 1000,
            comp.candidate.metrics.performance.avgDuration / 1000,
            comp.deltas.performance.avgDuration,
            's',
            true,
          )}
          ${this.renderComparisonRow(
            'Query Latency (p50)',
            comp.baseline.metrics.performance.avgQueryLatency.p50,
            comp.candidate.metrics.performance.avgQueryLatency.p50,
            comp.deltas.performance.avgQueryLatency_p50,
            'ms',
            true,
          )}
          ${this.renderComparisonRow(
            'Entities Found Rate',
            comp.baseline.metrics.correctness.entitiesFoundRate * 100,
            comp.candidate.metrics.correctness.entitiesFoundRate * 100,
            comp.deltas.correctness.entitiesFoundRate,
            '%',
            false,
          )}
          ${this.renderComparisonRow(
            'Success Rate',
            comp.baseline.metrics.reliability.successRate * 100,
            comp.candidate.metrics.reliability.successRate * 100,
            comp.deltas.reliability.successRate,
            '%',
            false,
          )}
        </tbody>
      </table>
    `;
  }

  private renderComparisonRow(
    label: string,
    baseline: number,
    candidate: number,
    delta: number,
    unit: string,
    lowerIsBetter: boolean,
  ): string {
    const deltaClass = this.getDeltaClass(delta, lowerIsBetter);
    const deltaSymbol = delta > 0 ? '+' : '';

    return `
      <tr>
        <td>${label}</td>
        <td>${baseline.toFixed(2)} ${unit}</td>
        <td>${candidate.toFixed(2)} ${unit}</td>
        <td class="${deltaClass}">${deltaSymbol}${delta.toFixed(1)}%</td>
      </tr>
    `;
  }

  private getDeltaClass(delta: number, lowerIsBetter: boolean): string {
    if (Math.abs(delta) < 5) return 'delta-neutral';

    if (lowerIsBetter) {
      return delta < 0 ? 'delta-positive' : 'delta-negative';
    } else {
      return delta > 0 ? 'delta-positive' : 'delta-negative';
    }
  }
}
