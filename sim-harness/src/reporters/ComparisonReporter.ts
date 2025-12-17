/**
 * Comparison Reporter
 * Generates comparison reports between baseline and candidate versions
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ComparisonReport,
  SessionMetrics,
  AggregatedMetrics,
} from '../types/index.js';
import { MetricsCollector } from '../metrics/MetricsCollector.js';
import { Logger } from '../utils/Logger.js';

export class ComparisonReporter {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ComparisonReporter');
  }

  /**
   * Generate comparison report between baseline and candidate
   */
  generateComparison(
    baseline: {
      version: string;
      metrics: SessionMetrics[];
    },
    candidate: {
      version: string;
      metrics: SessionMetrics[];
    }
  ): ComparisonReport {
    const collector = new MetricsCollector();

    const baselineAggregated = collector.aggregateMetrics(baseline.metrics);
    const candidateAggregated = collector.aggregateMetrics(candidate.metrics);

    // Calculate deltas
    const successRateDelta =
      candidateAggregated.averageSuccessRate -
      baselineAggregated.averageSuccessRate;
    const performanceDelta =
      ((baselineAggregated.averageDuration -
        candidateAggregated.averageDuration) /
        baselineAggregated.averageDuration) *
      100;
    const qualityDelta =
      candidateAggregated.averageF1Score -
      baselineAggregated.averageF1Score;

    // Identify regressions and improvements
    const regressions: string[] = [];
    const improvements: string[] = [];

    if (successRateDelta < -0.05) {
      regressions.push(
        `Success rate decreased by ${(Math.abs(successRateDelta) * 100).toFixed(2)}%`
      );
    } else if (successRateDelta > 0.05) {
      improvements.push(
        `Success rate improved by ${(successRateDelta * 100).toFixed(2)}%`
      );
    }

    if (performanceDelta < -10) {
      regressions.push(
        `Performance degraded by ${Math.abs(performanceDelta).toFixed(2)}%`
      );
    } else if (performanceDelta > 10) {
      improvements.push(
        `Performance improved by ${performanceDelta.toFixed(2)}%`
      );
    }

    if (qualityDelta < -0.05) {
      regressions.push(
        `F1 score decreased by ${(Math.abs(qualityDelta) * 100).toFixed(2)}%`
      );
    } else if (qualityDelta > 0.05) {
      improvements.push(
        `F1 score improved by ${(qualityDelta * 100).toFixed(2)}%`
      );
    }

    if (
      candidateAggregated.errorRate >
      baselineAggregated.errorRate * 1.2
    ) {
      regressions.push(
        `Error rate increased by ${((candidateAggregated.errorRate - baselineAggregated.errorRate) * 100).toFixed(2)}%`
      );
    } else if (
      candidateAggregated.errorRate <
      baselineAggregated.errorRate * 0.8
    ) {
      improvements.push(
        `Error rate decreased by ${((baselineAggregated.errorRate - candidateAggregated.errorRate) * 100).toFixed(2)}%`
      );
    }

    return {
      generatedAt: new Date().toISOString(),
      baseline: {
        version: baseline.version,
        metrics: baseline.metrics,
        aggregated: baselineAggregated,
      },
      candidate: {
        version: candidate.version,
        metrics: candidate.metrics,
        aggregated: candidateAggregated,
      },
      comparison: {
        successRateDelta,
        performanceDelta,
        qualityDelta,
        regressions,
        improvements,
      },
    };
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report: ComparisonReport): string {
    const hasRegressions = report.comparison.regressions.length > 0;
    const statusColor = hasRegressions ? '#dc3545' : '#28a745';
    const statusText = hasRegressions ? 'REGRESSIONS DETECTED' : 'ALL CLEAR';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulation Harness Comparison Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .status {
            background-color: ${statusColor};
            color: white;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 20px;
        }
        .section {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
        .metric-label {
            font-size: 0.85em;
            color: #666;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
        }
        .metric-delta {
            font-size: 0.9em;
            margin-top: 5px;
        }
        .metric-delta.positive {
            color: #28a745;
        }
        .metric-delta.negative {
            color: #dc3545;
        }
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .comparison-table th,
        .comparison-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .comparison-table th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .regression-list, .improvement-list {
            list-style: none;
            padding: 0;
        }
        .regression-list li {
            background-color: #f8d7da;
            color: #721c24;
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 5px;
            border-left: 4px solid #dc3545;
        }
        .improvement-list li {
            background-color: #d4edda;
            color: #155724;
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 5px;
            border-left: 4px solid #28a745;
        }
        h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        h3 {
            color: #555;
            margin-top: 20px;
        }
        .timestamp {
            color: #888;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>IntelGraph Simulation Harness</h1>
        <p>Comparison Report: ${report.baseline.version} → ${report.candidate.version}</p>
        <p class="timestamp">Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
    </div>

    <div class="status">
        ${statusText}
    </div>

    <div class="section">
        <h2>Summary</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">Success Rate</div>
                <div class="metric-value">${(report.candidate.aggregated.averageSuccessRate * 100).toFixed(1)}%</div>
                <div class="metric-delta ${report.comparison.successRateDelta >= 0 ? 'positive' : 'negative'}">
                    ${report.comparison.successRateDelta >= 0 ? '▲' : '▼'} ${Math.abs(report.comparison.successRateDelta * 100).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Average Duration</div>
                <div class="metric-value">${(report.candidate.aggregated.averageDuration / 1000).toFixed(2)}s</div>
                <div class="metric-delta ${report.comparison.performanceDelta >= 0 ? 'positive' : 'negative'}">
                    ${report.comparison.performanceDelta >= 0 ? '▼' : '▲'} ${Math.abs(report.comparison.performanceDelta).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">F1 Score</div>
                <div class="metric-value">${(report.candidate.aggregated.averageF1Score * 100).toFixed(1)}%</div>
                <div class="metric-delta ${report.comparison.qualityDelta >= 0 ? 'positive' : 'negative'}">
                    ${report.comparison.qualityDelta >= 0 ? '▲' : '▼'} ${Math.abs(report.comparison.qualityDelta * 100).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Coverage Rate</div>
                <div class="metric-value">${(report.candidate.aggregated.averageCoverageRate * 100).toFixed(1)}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Error Rate</div>
                <div class="metric-value">${(report.candidate.aggregated.errorRate * 100).toFixed(2)}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Total Sessions</div>
                <div class="metric-value">${report.candidate.aggregated.totalSessions}</div>
            </div>
        </div>
    </div>

    ${report.comparison.regressions.length > 0 ? `
    <div class="section">
        <h2>⚠️ Regressions Detected</h2>
        <ul class="regression-list">
            ${report.comparison.regressions.map(r => `<li>${r}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${report.comparison.improvements.length > 0 ? `
    <div class="section">
        <h2>✅ Improvements</h2>
        <ul class="improvement-list">
            ${report.comparison.improvements.map(i => `<li>${i}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="section">
        <h2>Detailed Comparison</h2>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Baseline (${report.baseline.version})</th>
                    <th>Candidate (${report.candidate.version})</th>
                    <th>Change</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Sessions</td>
                    <td>${report.baseline.aggregated.totalSessions}</td>
                    <td>${report.candidate.aggregated.totalSessions}</td>
                    <td>${report.candidate.aggregated.totalSessions - report.baseline.aggregated.totalSessions}</td>
                </tr>
                <tr>
                    <td>Avg Success Rate</td>
                    <td>${(report.baseline.aggregated.averageSuccessRate * 100).toFixed(2)}%</td>
                    <td>${(report.candidate.aggregated.averageSuccessRate * 100).toFixed(2)}%</td>
                    <td class="${report.comparison.successRateDelta >= 0 ? 'positive' : 'negative'}">
                        ${(report.comparison.successRateDelta * 100).toFixed(2)}%
                    </td>
                </tr>
                <tr>
                    <td>Avg Duration</td>
                    <td>${(report.baseline.aggregated.averageDuration / 1000).toFixed(2)}s</td>
                    <td>${(report.candidate.aggregated.averageDuration / 1000).toFixed(2)}s</td>
                    <td class="${report.comparison.performanceDelta >= 0 ? 'positive' : 'negative'}">
                        ${report.comparison.performanceDelta.toFixed(2)}%
                    </td>
                </tr>
                <tr>
                    <td>Avg Coverage Rate</td>
                    <td>${(report.baseline.aggregated.averageCoverageRate * 100).toFixed(2)}%</td>
                    <td>${(report.candidate.aggregated.averageCoverageRate * 100).toFixed(2)}%</td>
                    <td>${((report.candidate.aggregated.averageCoverageRate - report.baseline.aggregated.averageCoverageRate) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Avg Precision</td>
                    <td>${(report.baseline.aggregated.averagePrecision * 100).toFixed(2)}%</td>
                    <td>${(report.candidate.aggregated.averagePrecision * 100).toFixed(2)}%</td>
                    <td>${((report.candidate.aggregated.averagePrecision - report.baseline.aggregated.averagePrecision) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Avg Recall</td>
                    <td>${(report.baseline.aggregated.averageRecall * 100).toFixed(2)}%</td>
                    <td>${(report.candidate.aggregated.averageRecall * 100).toFixed(2)}%</td>
                    <td>${((report.candidate.aggregated.averageRecall - report.baseline.aggregated.averageRecall) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Avg F1 Score</td>
                    <td>${(report.baseline.aggregated.averageF1Score * 100).toFixed(2)}%</td>
                    <td>${(report.candidate.aggregated.averageF1Score * 100).toFixed(2)}%</td>
                    <td class="${report.comparison.qualityDelta >= 0 ? 'positive' : 'negative'}">
                        ${(report.comparison.qualityDelta * 100).toFixed(2)}%
                    </td>
                </tr>
                <tr>
                    <td>Error Rate</td>
                    <td>${(report.baseline.aggregated.errorRate * 100).toFixed(2)}%</td>
                    <td>${(report.candidate.aggregated.errorRate * 100).toFixed(2)}%</td>
                    <td class="${report.candidate.aggregated.errorRate <= report.baseline.aggregated.errorRate ? 'positive' : 'negative'}">
                        ${((report.candidate.aggregated.errorRate - report.baseline.aggregated.errorRate) * 100).toFixed(2)}%
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Per-Scenario Breakdown</h2>
        <h3>Baseline: ${report.baseline.version}</h3>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Session ID</th>
                    <th>Scenario</th>
                    <th>Success Rate</th>
                    <th>Duration</th>
                    <th>Coverage</th>
                    <th>F1 Score</th>
                </tr>
            </thead>
            <tbody>
                ${report.baseline.metrics.map(m => `
                    <tr>
                        <td>${m.sessionId.substring(0, 8)}</td>
                        <td>${m.scenarioType}</td>
                        <td>${(m.successRate * 100).toFixed(1)}%</td>
                        <td>${(m.duration! / 1000).toFixed(2)}s</td>
                        <td>${(m.coverageRate * 100).toFixed(1)}%</td>
                        <td>${((m.f1Score || 0) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h3>Candidate: ${report.candidate.version}</h3>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Session ID</th>
                    <th>Scenario</th>
                    <th>Success Rate</th>
                    <th>Duration</th>
                    <th>Coverage</th>
                    <th>F1 Score</th>
                </tr>
            </thead>
            <tbody>
                ${report.candidate.metrics.map(m => `
                    <tr>
                        <td>${m.sessionId.substring(0, 8)}</td>
                        <td>${m.scenarioType}</td>
                        <td>${(m.successRate * 100).toFixed(1)}%</td>
                        <td>${(m.duration! / 1000).toFixed(2)}s</td>
                        <td>${(m.coverageRate * 100).toFixed(1)}%</td>
                        <td>${((m.f1Score || 0) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report: ComparisonReport): string {
    const hasRegressions = report.comparison.regressions.length > 0;
    const statusEmoji = hasRegressions ? '⚠️' : '✅';

    return `
# IntelGraph Simulation Harness - Comparison Report

**Status:** ${statusEmoji} ${hasRegressions ? 'REGRESSIONS DETECTED' : 'ALL CLEAR'}

**Comparison:** ${report.baseline.version} → ${report.candidate.version}

**Generated:** ${new Date(report.generatedAt).toLocaleString()}

---

## Summary

| Metric | Baseline | Candidate | Change |
|--------|----------|-----------|--------|
| Success Rate | ${(report.baseline.aggregated.averageSuccessRate * 100).toFixed(2)}% | ${(report.candidate.aggregated.averageSuccessRate * 100).toFixed(2)}% | ${(report.comparison.successRateDelta * 100).toFixed(2)}% |
| Avg Duration | ${(report.baseline.aggregated.averageDuration / 1000).toFixed(2)}s | ${(report.candidate.aggregated.averageDuration / 1000).toFixed(2)}s | ${report.comparison.performanceDelta.toFixed(2)}% |
| F1 Score | ${(report.baseline.aggregated.averageF1Score * 100).toFixed(2)}% | ${(report.candidate.aggregated.averageF1Score * 100).toFixed(2)}% | ${(report.comparison.qualityDelta * 100).toFixed(2)}% |
| Coverage Rate | ${(report.baseline.aggregated.averageCoverageRate * 100).toFixed(2)}% | ${(report.candidate.aggregated.averageCoverageRate * 100).toFixed(2)}% | - |
| Error Rate | ${(report.baseline.aggregated.errorRate * 100).toFixed(2)}% | ${(report.candidate.aggregated.errorRate * 100).toFixed(2)}% | - |

${
      report.comparison.regressions.length > 0
        ? `
## ⚠️ Regressions

${report.comparison.regressions.map((r) => `- ${r}`).join('\n')}
`
        : ''
    }

${
      report.comparison.improvements.length > 0
        ? `
## ✅ Improvements

${report.comparison.improvements.map((i) => `- ${i}`).join('\n')}
`
        : ''
    }

## Sessions

### Baseline (${report.baseline.version})

Total Sessions: ${report.baseline.aggregated.totalSessions}

### Candidate (${report.candidate.version})

Total Sessions: ${report.candidate.aggregated.totalSessions}

---

*Generated by IntelGraph Simulation Harness*
    `.trim();
  }

  /**
   * Save report to file
   */
  async saveReport(
    report: ComparisonReport,
    outputDir: string,
    format: 'html' | 'json' | 'markdown' = 'html'
  ): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comparison-${report.baseline.version}-to-${report.candidate.version}-${timestamp}`;

    let content: string;
    let extension: string;

    switch (format) {
      case 'html':
        content = this.generateHTMLReport(report);
        extension = 'html';
        break;
      case 'markdown':
        content = this.generateMarkdownReport(report);
        extension = 'md';
        break;
      case 'json':
        content = JSON.stringify(report, null, 2);
        extension = 'json';
        break;
    }

    const filepath = path.join(outputDir, `${filename}.${extension}`);
    fs.writeFileSync(filepath, content, 'utf8');

    this.logger.info(`Report saved to: ${filepath}`);

    return filepath;
  }
}
