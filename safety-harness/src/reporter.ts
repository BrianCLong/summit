/**
 * Reporter for Safety Harness Results
 *
 * Generates reports in multiple formats: JSON, HTML, Markdown, JUnit, CSV
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import dayjs from 'dayjs';
import { table } from 'table';
import chalk from 'chalk';
import { TestRun, TestResult, ReportFormat, ReportConfig } from './types.js';
import { MetricsCollector, MetricsSummary } from './metrics.js';

export class SafetyReporter {
  private testRun: TestRun;
  private metrics?: MetricsSummary;

  constructor(testRun: TestRun) {
    this.testRun = testRun;
  }

  /**
   * Set metrics summary
   */
  setMetrics(metrics: MetricsSummary): void {
    this.metrics = metrics;
  }

  /**
   * Generate report in specified format
   */
  async generate(config: ReportConfig): Promise<void> {
    switch (config.format) {
      case 'json':
        return this.generateJSON(config);
      case 'html':
        return this.generateHTML(config);
      case 'markdown':
        return this.generateMarkdown(config);
      case 'junit':
        return this.generateJUnit(config);
      case 'csv':
        return this.generateCSV(config);
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  /**
   * Generate JSON report
   */
  private async generateJSON(config: ReportConfig): Promise<void> {
    const report = {
      runId: this.testRun.runId,
      startTime: this.testRun.startTime,
      endTime: this.testRun.endTime,
      durationMs: this.testRun.durationMs,
      config: this.testRun.config,
      summary: this.testRun.summary,
      metrics: this.metrics,
      testPacks: this.testRun.testPacks,
      results: config.includeDetails ? this.testRun.results : undefined,
      regressions: this.testRun.regressions,
    };

    const content = JSON.stringify(report, null, 2);
    await writeFile(config.outputPath, content, 'utf-8');
  }

  /**
   * Generate HTML report
   */
  private async generateHTML(config: ReportConfig): Promise<void> {
    const { summary } = this.testRun;
    const failed = this.testRun.results.filter(r => !r.passed);

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Safety Harness Report - ${this.testRun.runId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
        h2 { color: #0066cc; margin-top: 30px; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric {
            padding: 20px;
            border-radius: 6px;
            background: #f8f9fa;
        }
        .metric-value { font-size: 32px; font-weight: bold; margin: 10px 0; }
        .metric-label { font-size: 14px; color: #666; text-transform: uppercase; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .critical { color: #dc3545; font-weight: bold; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #17a2b8; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #0066cc;
            color: white;
            font-weight: 600;
        }
        tr:hover { background: #f8f9fa; }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-critical { background: #dc3545; color: white; }
        .badge-high { background: #fd7e14; color: white; }
        .badge-medium { background: #ffc107; color: black; }
        .badge-low { background: #17a2b8; color: white; }
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        }
        .progress-fill {
            height: 100%;
            background: #28a745;
            transition: width 0.3s;
        }
        .progress-label {
            position: absolute;
            width: 100%;
            text-align: center;
            line-height: 30px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Safety Harness Test Report</h1>

        <div class="summary">
            <div class="metric">
                <div class="metric-label">Total Tests</div>
                <div class="metric-value">${summary.total}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Passed</div>
                <div class="metric-value passed">${summary.passed}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Failed</div>
                <div class="metric-value failed">${summary.failed}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Pass Rate</div>
                <div class="metric-value">${(summary.passed / summary.total * 100).toFixed(1)}%</div>
            </div>
        </div>

        <h2>Pass Rate</h2>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${summary.passed / summary.total * 100}%"></div>
            <div class="progress-label">${summary.passed} / ${summary.total} passed</div>
        </div>

        <h2>Failures by Severity</h2>
        <div class="summary">
            <div class="metric">
                <div class="metric-label">Critical</div>
                <div class="metric-value critical">${this.countFailuresBySeverity('critical')}</div>
            </div>
            <div class="metric">
                <div class="metric-label">High</div>
                <div class="metric-value high">${this.countFailuresBySeverity('high')}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Medium</div>
                <div class="metric-value medium">${this.countFailuresBySeverity('medium')}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Low</div>
                <div class="metric-value low">${this.countFailuresBySeverity('low')}</div>
            </div>
        </div>

        ${config.highlightFailures && failed.length > 0 ? `
        <h2>❌ Failed Tests</h2>
        <table>
            <thead>
                <tr>
                    <th>Scenario ID</th>
                    <th>Severity</th>
                    <th>Failure Reason</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
                ${failed.map(r => `
                <tr>
                    <td><code>${r.scenarioId}</code></td>
                    <td><span class="badge badge-${r.failure?.severity}">${r.failure?.severity?.toUpperCase()}</span></td>
                    <td>${r.failure?.reason || 'Unknown'}</td>
                    <td>${r.durationMs}ms</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        ${this.testRun.regressions && this.testRun.regressions.length > 0 ? `
        <h2>⚠️ Regressions</h2>
        <table>
            <thead>
                <tr>
                    <th>Scenario ID</th>
                    <th>Previous</th>
                    <th>Current</th>
                    <th>Severity</th>
                </tr>
            </thead>
            <tbody>
                ${this.testRun.regressions.map(r => `
                <tr>
                    <td><code>${r.scenarioId}</code></td>
                    <td class="passed">${r.previousResult}</td>
                    <td class="failed">${r.currentResult}</td>
                    <td><span class="badge badge-${r.severity}">${r.severity.toUpperCase()}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        <h2>📊 Breakdown by Component</h2>
        <table>
            <thead>
                <tr>
                    <th>Component</th>
                    <th>Total</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Pass Rate</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(summary.byComponent).map(([comp, stats]) => `
                <tr>
                    <td><strong>${comp}</strong></td>
                    <td>${stats.total}</td>
                    <td class="passed">${stats.passed}</td>
                    <td class="failed">${stats.failed}</td>
                    <td>${(stats.passed / stats.total * 100).toFixed(1)}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>📈 Breakdown by Risk Level</h2>
        <table>
            <thead>
                <tr>
                    <th>Risk Level</th>
                    <th>Total</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Pass Rate</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(summary.byRiskLevel).map(([level, stats]) => `
                <tr>
                    <td><span class="badge badge-${level}">${level.toUpperCase()}</span></td>
                    <td>${stats.total}</td>
                    <td class="passed">${stats.passed}</td>
                    <td class="failed">${stats.failed}</td>
                    <td>${(stats.passed / stats.total * 100).toFixed(1)}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <hr style="margin: 40px 0;">
        <p style="color: #666; font-size: 14px;">
            Run ID: ${this.testRun.runId}<br>
            Environment: ${this.testRun.config.environment}<br>
            Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}<br>
            Duration: ${(this.testRun.durationMs / 1000).toFixed(2)}s
        </p>
    </div>
</body>
</html>`;

    await writeFile(config.outputPath, html, 'utf-8');
  }

  /**
   * Generate Markdown report
   */
  private async generateMarkdown(config: ReportConfig): Promise<void> {
    const { summary } = this.testRun;
    const failed = this.testRun.results.filter(r => !r.passed);

    let md = `# 🛡️ Safety Harness Test Report\n\n`;
    md += `**Run ID:** \`${this.testRun.runId}\`\n\n`;
    md += `**Environment:** ${this.testRun.config.environment}\n\n`;
    md += `**Duration:** ${(this.testRun.durationMs / 1000).toFixed(2)}s\n\n`;
    md += `---\n\n`;

    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Tests | ${summary.total} |\n`;
    md += `| ✅ Passed | ${summary.passed} |\n`;
    md += `| ❌ Failed | ${summary.failed} |\n`;
    md += `| Pass Rate | ${(summary.passed / summary.total * 100).toFixed(1)}% |\n`;
    md += `| Error Rate | ${(summary.errorRate * 100).toFixed(1)}% |\n\n`;

    md += `## Failures by Severity\n\n`;
    md += `| Severity | Count |\n`;
    md += `|----------|-------|\n`;
    md += `| 🔴 Critical | ${this.countFailuresBySeverity('critical')} |\n`;
    md += `| 🟠 High | ${this.countFailuresBySeverity('high')} |\n`;
    md += `| 🟡 Medium | ${this.countFailuresBySeverity('medium')} |\n`;
    md += `| 🔵 Low | ${this.countFailuresBySeverity('low')} |\n\n`;

    if (config.highlightFailures && failed.length > 0) {
      md += `## ❌ Failed Tests\n\n`;
      md += `| Scenario | Severity | Reason | Duration |\n`;
      md += `|----------|----------|--------|----------|\n`;
      for (const result of failed) {
        md += `| \`${result.scenarioId}\` | ${result.failure?.severity || 'N/A'} | ${result.failure?.reason || 'Unknown'} | ${result.durationMs}ms |\n`;
      }
      md += `\n`;
    }

    if (this.testRun.regressions && this.testRun.regressions.length > 0) {
      md += `## ⚠️ Regressions\n\n`;
      md += `| Scenario | Previous | Current | Severity |\n`;
      md += `|----------|----------|---------|----------|\n`;
      for (const reg of this.testRun.regressions) {
        md += `| \`${reg.scenarioId}\` | ${reg.previousResult} | ${reg.currentResult} | ${reg.severity} |\n`;
      }
      md += `\n`;
    }

    md += `## 📊 Breakdown by Component\n\n`;
    md += `| Component | Total | Passed | Failed | Pass Rate |\n`;
    md += `|-----------|-------|--------|--------|-----------|\n`;
    for (const [comp, stats] of Object.entries(summary.byComponent)) {
      md += `| ${comp} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${(stats.passed / stats.total * 100).toFixed(1)}% |\n`;
    }
    md += `\n`;

    md += `## 📈 Breakdown by Risk Level\n\n`;
    md += `| Risk Level | Total | Passed | Failed | Pass Rate |\n`;
    md += `|------------|-------|--------|--------|-----------|\n`;
    for (const [level, stats] of Object.entries(summary.byRiskLevel)) {
      md += `| ${level} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${(stats.passed / stats.total * 100).toFixed(1)}% |\n`;
    }
    md += `\n`;

    md += `---\n\n`;
    md += `*Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}*\n`;

    await writeFile(config.outputPath, md, 'utf-8');
  }

  /**
   * Generate JUnit XML report for CI/CD integration
   */
  private async generateJUnit(config: ReportConfig): Promise<void> {
    const { summary, results } = this.testRun;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuites name="Safety Harness" tests="${summary.total}" failures="${summary.failed}" time="${this.testRun.durationMs / 1000}">\n`;
    xml += `  <testsuite name="Safety Tests" tests="${summary.total}" failures="${summary.failed}" time="${this.testRun.durationMs / 1000}">\n`;

    for (const result of results) {
      xml += `    <testcase name="${this.escapeXml(result.scenarioId)}" time="${result.durationMs / 1000}">\n`;
      if (!result.passed && result.failure) {
        xml += `      <failure message="${this.escapeXml(result.failure.reason)}" type="${result.failure.severity}">\n`;
        xml += `        ${this.escapeXml(JSON.stringify(result.failure.details, null, 2))}\n`;
        xml += `      </failure>\n`;
      }
      xml += `    </testcase>\n`;
    }

    xml += `  </testsuite>\n`;
    xml += `</testsuites>\n`;

    await writeFile(config.outputPath, xml, 'utf-8');
  }

  /**
   * Generate CSV report
   */
  private async generateCSV(config: ReportConfig): Promise<void> {
    const rows = [
      ['Scenario ID', 'Passed', 'Duration (ms)', 'Outcome', 'Risk Score', 'Failure Reason'].join(',')
    ];

    for (const result of this.testRun.results) {
      rows.push([
        result.scenarioId,
        result.passed ? 'true' : 'false',
        result.durationMs.toString(),
        result.actual.outcome,
        result.actual.riskScore?.toString() || 'N/A',
        result.failure?.reason?.replace(/,/g, ';') || '',
      ].join(','));
    }

    await writeFile(config.outputPath, rows.join('\n'), 'utf-8');
  }

  /**
   * Print summary to console
   */
  printConsoleSummary(): void {
    const { summary } = this.testRun;

    console.log('\n' + chalk.bold('🛡️  Safety Harness Test Report'));
    console.log(chalk.gray('═'.repeat(60)));

    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  Total Tests:  ${summary.total}`);
    console.log(`  ${chalk.green('✓ Passed:')}     ${summary.passed}`);
    console.log(`  ${chalk.red('✗ Failed:')}     ${summary.failed}`);
    console.log(`  Pass Rate:    ${(summary.passed / summary.total * 100).toFixed(1)}%`);

    console.log(chalk.bold('\n🎯 Failures by Severity:'));
    console.log(`  ${chalk.red('Critical:')} ${this.countFailuresBySeverity('critical')}`);
    console.log(`  ${chalk.yellow('High:')}     ${this.countFailuresBySeverity('high')}`);
    console.log(`  ${chalk.blue('Medium:')}   ${this.countFailuresBySeverity('medium')}`);
    console.log(`  ${chalk.gray('Low:')}      ${this.countFailuresBySeverity('low')}`);

    if (this.testRun.regressions && this.testRun.regressions.length > 0) {
      console.log(chalk.bold('\n⚠️  Regressions:') + chalk.red(` ${this.testRun.regressions.length}`));
    }

    console.log(chalk.gray('\n' + '═'.repeat(60)));
    console.log(`Duration: ${(this.testRun.durationMs / 1000).toFixed(2)}s\n`);
  }

  /**
   * Count failures by severity
   */
  private countFailuresBySeverity(severity: string): number {
    return this.testRun.results.filter(
      r => !r.passed && r.failure?.severity === severity
    ).length;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
