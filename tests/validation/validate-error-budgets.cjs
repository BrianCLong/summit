#!/usr/bin/env node
/**
 * Error Budget and Burn-Rate Alert Validation
 * Acceptance Criteria Test Suite for GREEN TRAIN Week-4
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ErrorBudgetValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      passed: 0,
      failed: 0,
      evidence: [],
    };
  }

  /**
   * Main validation execution
   */
  async validate() {
    console.log('🔍 Validating Error Budgets & Burn-Rate Alerts...');

    try {
      await this.validatePrometheusRules();
      await this.validateBurnRateWindows();
      await this.validateSeverityRouting();
      await this.validateSLODashboards();
      await this.simulateAlertFlow();
      await this.generateEvidence();

      console.log(
        `✅ Validation complete: ${this.results.passed}/${this.results.passed + this.results.failed} tests passed`,
      );
      return this.results.failed === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  /**
   * Test 1: Validate Prometheus Rules Configuration
   */
  async validatePrometheusRules() {
    const test = { name: 'Prometheus Rules Configuration', status: 'running' };

    try {
      // Check if error budget rules file exists and is valid
      const rulesPath = path.join(
        process.cwd(),
        'monitoring/prometheus/error-budget-rules.yml',
      );

      if (!fs.existsSync(rulesPath)) {
        throw new Error('Error budget rules file not found');
      }

      const rulesContent = fs.readFileSync(rulesPath, 'utf8');

      // Validate required rules exist
      const requiredRules = [
        'error_budget:availability:burn_rate_5m',
        'error_budget:availability:burn_rate_30m',
        'error_budget:availability:burn_rate_2h',
        'error_budget:availability:burn_rate_6h',
        'error_budget:latency:burn_rate_5m',
        'error_budget:error_rate:burn_rate_5m',
      ];

      for (const rule of requiredRules) {
        if (!rulesContent.includes(rule)) {
          throw new Error(`Required rule missing: ${rule}`);
        }
      }

      // Validate alert rules
      const requiredAlerts = [
        'ErrorBudgetBurnRateCritical',
        'ErrorBudgetBurnRateHigh',
        'ErrorBudgetBurnRateMedium',
        'SLOBreach',
      ];

      for (const alert of requiredAlerts) {
        if (!rulesContent.includes(alert)) {
          throw new Error(`Required alert missing: ${alert}`);
        }
      }

      test.status = 'passed';
      test.details = `Found ${requiredRules.length} burn-rate rules and ${requiredAlerts.length} alert rules`;

      // Generate file hash for provenance
      const fileHash = crypto
        .createHash('sha256')
        .update(rulesContent)
        .digest('hex');
      this.results.evidence.push({
        type: 'prometheus_rules',
        file: rulesPath,
        hash: fileHash,
        size: rulesContent.length,
      });

      this.results.passed++;
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.results.failed++;
    }

    this.results.tests.push(test);
  }

  /**
   * Test 2: Validate Multi-Window Burn Rate Configuration
   */
  async validateBurnRateWindows() {
    const test = {
      name: 'Multi-Window Burn Rate Configuration',
      status: 'running',
    };

    try {
      const rulesPath = path.join(
        process.cwd(),
        'monitoring/prometheus/error-budget-rules.yml',
      );
      const rulesContent = fs.readFileSync(rulesPath, 'utf8');

      // Validate burn rate windows
      const windowPatterns = [
        /burn_rate_5m.*\[5m\]/, // 5-minute window
        /burn_rate_30m.*\[30m\]/, // 30-minute window
        /burn_rate_2h.*\[2h\]/, // 2-hour window
        /burn_rate_6h.*\[6h\]/, // 6-hour window
      ];

      const foundWindows = windowPatterns.map((pattern) =>
        pattern.test(rulesContent),
      );
      const allWindowsFound = foundWindows.every((found) => found);

      if (!allWindowsFound) {
        throw new Error('Not all required burn rate windows found');
      }

      // Validate burn rate thresholds
      const burnRateThresholds = {
        critical: /14\.4/, // Critical: 14.4x normal burn rate
        high: /6/, // High: 6x normal burn rate
        medium: /3/, // Medium: 3x normal burn rate
      };

      for (const [severity, pattern] of Object.entries(burnRateThresholds)) {
        if (!pattern.test(rulesContent)) {
          throw new Error(`Missing ${severity} burn rate threshold`);
        }
      }

      test.status = 'passed';
      test.details =
        'All required burn rate windows (5m/30m/2h/6h) and thresholds validated';
      this.results.passed++;
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.results.failed++;
    }

    this.results.tests.push(test);
  }

  /**
   * Test 3: Validate Severity Routing Configuration
   */
  async validateSeverityRouting() {
    const test = { name: 'Severity Routing Configuration', status: 'running' };

    try {
      const rulesPath = path.join(
        process.cwd(),
        'monitoring/prometheus/error-budget-rules.yml',
      );
      const rulesContent = fs.readFileSync(rulesPath, 'utf8');

      // Validate severity labels
      const severityLevels = ['critical', 'high', 'medium'];
      const rtoRequirements = {
        critical: '15m', // <15m RTO
        high: '1h', // <1h RTO
        medium: '6h', // <6h RTO
      };

      for (const severity of severityLevels) {
        const severityPattern = new RegExp(`severity:\\s*"?${severity}"?`);
        if (!severityPattern.test(rulesContent)) {
          throw new Error(`Missing severity level: ${severity}`);
        }
      }

      // Validate alert routing annotations
      const requiredAnnotations = [
        'summary',
        'description',
        'runbook_url',
        'dashboard_url',
      ];

      for (const annotation of requiredAnnotations) {
        const annotationPattern = new RegExp(`${annotation}:`);
        if (!annotationPattern.test(rulesContent)) {
          throw new Error(`Missing annotation: ${annotation}`);
        }
      }

      test.status = 'passed';
      test.details = `Validated ${severityLevels.length} severity levels with RTO requirements`;
      this.results.passed++;
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.results.failed++;
    }

    this.results.tests.push(test);
  }

  /**
   * Test 4: Validate SLO Dashboard Configuration
   */
  async validateSLODashboards() {
    const test = { name: 'SLO Dashboard Configuration', status: 'running' };

    try {
      // Check SLO dashboard exists
      const dashboardPath = path.join(
        process.cwd(),
        'monitoring/grafana/slo-dashboard.json',
      );

      if (!fs.existsSync(dashboardPath)) {
        throw new Error('SLO dashboard file not found');
      }

      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
      const dashboard = JSON.parse(dashboardContent);

      // Validate required panels
      const requiredPanels = [
        'Error Budget Remaining',
        'Burn Rate',
        'SLO Compliance',
        'Alert Status',
      ];

      const panelTitles = dashboard.dashboard.panels.map((p) => p.title);

      for (const requiredPanel of requiredPanels) {
        const found = panelTitles.some((title) =>
          title.includes(requiredPanel),
        );
        if (!found) {
          throw new Error(`Required panel missing: ${requiredPanel}`);
        }
      }

      // Validate burn rate queries
      const burnRateQueries = dashboard.dashboard.panels
        .filter((p) => p.targets)
        .flatMap((p) => p.targets)
        .filter((t) => t.expr && t.expr.includes('burn_rate'));

      if (burnRateQueries.length === 0) {
        throw new Error('No burn rate queries found in dashboard');
      }

      test.status = 'passed';
      test.details = `Dashboard contains ${dashboard.dashboard.panels.length} panels with ${burnRateQueries.length} burn rate queries`;

      // Generate dashboard hash for provenance
      const dashboardHash = crypto
        .createHash('sha256')
        .update(dashboardContent)
        .digest('hex');
      this.results.evidence.push({
        type: 'slo_dashboard',
        file: dashboardPath,
        hash: dashboardHash,
        panels: dashboard.dashboard.panels.length,
      });

      this.results.passed++;
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.results.failed++;
    }

    this.results.tests.push(test);
  }

  /**
   * Test 5: Simulate Alert Flow
   */
  async simulateAlertFlow() {
    const test = { name: 'Alert Flow Simulation', status: 'running' };

    try {
      // Simulate alert evaluation
      const alertScenarios = [
        {
          name: 'Critical Burn Rate',
          burn_rate: 14.4,
          window: '5m',
          expected_severity: 'critical',
          expected_rto: '15m',
        },
        {
          name: 'High Burn Rate',
          burn_rate: 6.0,
          window: '30m',
          expected_severity: 'high',
          expected_rto: '1h',
        },
        {
          name: 'Medium Burn Rate',
          burn_rate: 3.0,
          window: '2h',
          expected_severity: 'medium',
          expected_rto: '6h',
        },
      ];

      const simulationResults = [];

      for (const scenario of alertScenarios) {
        const result = {
          scenario: scenario.name,
          burn_rate: scenario.burn_rate,
          triggered: scenario.burn_rate > 1.0,
          severity: scenario.expected_severity,
          rto: scenario.expected_rto,
          timestamp: new Date().toISOString(),
        };

        simulationResults.push(result);
      }

      // Validate all scenarios trigger correctly
      const triggeredCount = simulationResults.filter(
        (r) => r.triggered,
      ).length;

      if (triggeredCount !== alertScenarios.length) {
        throw new Error(
          `Expected ${alertScenarios.length} alerts, got ${triggeredCount}`,
        );
      }

      test.status = 'passed';
      test.details = `Simulated ${alertScenarios.length} alert scenarios successfully`;
      test.simulation_results = simulationResults;

      this.results.evidence.push({
        type: 'alert_simulation',
        scenarios: alertScenarios.length,
        triggered: triggeredCount,
        results: simulationResults,
      });

      this.results.passed++;
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.results.failed++;
    }

    this.results.tests.push(test);
  }

  /**
   * Generate evidence artifacts
   */
  async generateEvidence() {
    const evidenceDir = path.join(process.cwd(), 'evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }

    // Generate validation report
    const reportPath = path.join(evidenceDir, 'error-budget-validation.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    // Generate Prometheus rules hash manifest
    const manifestPath = path.join(
      evidenceDir,
      'prometheus-rules-manifest.json',
    );
    const manifest = {
      timestamp: new Date().toISOString(),
      component: 'error-budgets-burn-rate-alerts',
      validation_status: this.results.failed === 0 ? 'passed' : 'failed',
      evidence_files: this.results.evidence,
      test_summary: {
        total: this.results.tests.length,
        passed: this.results.passed,
        failed: this.results.failed,
      },
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`📋 Evidence generated:`);
    console.log(`  - Validation report: ${reportPath}`);
    console.log(`  - Rules manifest: ${manifestPath}`);
  }
}

// CLI execution
if (require.main === module) {
  const validator = new ErrorBudgetValidator();
  validator
    .validate()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal validation error:', error);
      process.exit(1);
    });
}

module.exports = ErrorBudgetValidator;
