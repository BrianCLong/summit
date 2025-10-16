#!/usr/bin/env node

/**
 * Comprehensive Quality Gate System for Maestro Build Plane
 * Orchestrates all quality checks and provides go/no-go decisions for deployments
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import our quality tools
import TestRunner from './test-runner.js';
import SecurityScanner from './security-scanner.js';
import AccessibilityChecker from './accessibility-checker.js';
import PerformanceMonitor from './performance-monitor.js';
import HealthChecker from './health-checker.js';
import VisualTesting from './visual-testing.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

class QualityGate {
  constructor() {
    this.reportDir = join(root, 'test-results', 'quality-gate');
    this.startTime = Date.now();
    this.results = {
      linting: null,
      typeChecking: null,
      unitTests: null,
      integrationTests: null,
      e2eTests: null,
      visualTests: null,
      securityScan: null,
      accessibilityTests: null,
      performanceTests: null,
      buildValidation: null,
      bundleAnalysis: null,
      healthChecks: null,
    };
    this.qualityMetrics = {
      codeQuality: 0,
      testCoverage: 0,
      security: 0,
      accessibility: 0,
      performance: 0,
      overall: 0,
    };
    this.gateConfig = this.loadGateConfiguration();
  }

  loadGateConfiguration() {
    // Default quality gate configuration
    const defaultConfig = {
      thresholds: {
        codeQuality: 85, // Minimum code quality score
        testCoverage: 80, // Minimum test coverage percentage
        security: 90, // Minimum security score (no critical/high issues)
        accessibility: 85, // Minimum accessibility score
        performance: 80, // Minimum performance score
        overall: 80, // Minimum overall quality score
      },
      required: {
        linting: true,
        typeChecking: true,
        unitTests: true,
        integrationTests: true,
        e2eTests: false, // Optional for faster gates
        visualTests: false, // Optional for faster gates
        securityScan: true,
        accessibilityTests: false, // Optional but recommended
        performanceTests: false, // Optional for dev builds
        buildValidation: true,
        bundleAnalysis: false, // Optional
        healthChecks: false, // Optional for CI builds
      },
      blocking: {
        criticalSecurityIssues: true,
        buildFailures: true,
        lintingErrors: true,
        typeErrors: true,
        testFailures: true,
      },
      environment: 'development', // development, staging, production
    };

    // Try to load custom configuration
    const configPath = join(root, 'quality-gate.config.js');
    if (existsSync(configPath)) {
      try {
        const customConfig = require(configPath);
        return { ...defaultConfig, ...customConfig };
      } catch (error) {
        console.log(
          '⚠️ Failed to load custom quality gate config, using defaults',
        );
        return defaultConfig;
      }
    }

    return defaultConfig;
  }

  async setup() {
    console.log('🏁 Setting up Quality Gate system...');

    // Create report directory
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }

    // Determine which environment we're in
    const environment =
      process.env.NODE_ENV || process.env.CI ? 'ci' : 'development';
    console.log(`  Environment: ${environment}`);

    // Adjust configuration based on environment
    if (environment === 'ci' || environment === 'production') {
      this.gateConfig.required.e2eTests = true;
      this.gateConfig.required.securityScan = true;
      this.gateConfig.required.accessibilityTests = true;
      this.gateConfig.thresholds.overall = 85;
    }
  }

  async runLinting() {
    if (!this.gateConfig.required.linting) {
      console.log('📝 Linting: SKIPPED');
      return { skipped: true };
    }

    console.log('📝 Running linting checks...');

    try {
      const { stdout, stderr } = await execAsync('npm run lint', {
        cwd: root,
        timeout: 60000,
      });

      // Parse linting output for errors and warnings
      const errors = (stderr.match(/error/gi) || []).length;
      const warnings = (stdout.match(/warning/gi) || []).length;

      const result = {
        passed: errors === 0,
        errors,
        warnings,
        output: stdout,
        score: errors === 0 ? (warnings === 0 ? 100 : 85) : 0,
      };

      this.results.linting = result;
      console.log(`  ✅ Linting: ${errors} errors, ${warnings} warnings`);

      return result;
    } catch (error) {
      const result = {
        passed: false,
        errors: -1,
        warnings: -1,
        error: error.message,
        score: 0,
      };

      this.results.linting = result;
      console.log('  ❌ Linting: Failed');

      return result;
    }
  }

  async runTypeChecking() {
    if (!this.gateConfig.required.typeChecking) {
      console.log('🔍 Type Checking: SKIPPED');
      return { skipped: true };
    }

    console.log('🔍 Running type checking...');

    try {
      const { stdout, stderr } = await execAsync('npm run typecheck', {
        cwd: root,
        timeout: 90000,
      });

      // Parse TypeScript output for errors
      const errors = (stderr.match(/error TS\d+/gi) || []).length;

      const result = {
        passed: errors === 0,
        errors,
        output: stdout,
        errorOutput: stderr,
        score: errors === 0 ? 100 : Math.max(0, 100 - errors * 10),
      };

      this.results.typeChecking = result;
      console.log(`  ✅ Type Checking: ${errors} errors`);

      return result;
    } catch (error) {
      const result = {
        passed: false,
        errors: -1,
        error: error.message,
        score: 0,
      };

      this.results.typeChecking = result;
      console.log('  ❌ Type Checking: Failed');

      return result;
    }
  }

  async runTests() {
    console.log('🧪 Running comprehensive test suite...');

    try {
      const testRunner = new TestRunner();

      const testOptions = {
        skipE2E: !this.gateConfig.required.e2eTests,
        skipVisual: !this.gateConfig.required.visualTests,
        parallel: true,
        coverage: true,
        generateReport: true,
      };

      await testRunner.runAllTests(testOptions);

      // Extract results from test runner
      const summary = testRunner.generateSummary();

      const result = {
        passed: summary.overallPassed,
        totalTests: summary.totals.tests,
        passedTests: summary.totals.passed,
        failedTests: summary.totals.failed,
        skippedTests: summary.totals.skipped,
        successRate: parseFloat(summary.successRate),
        coverage: testRunner.results.unit?.coverage || null,
        score: parseFloat(summary.successRate),
      };

      // Store individual test results
      this.results.unitTests = testRunner.results.unit;
      this.results.integrationTests = testRunner.results.integration;
      this.results.e2eTests = testRunner.results.e2e;
      this.results.visualTests = testRunner.results.visual;

      console.log(
        `  ✅ Tests: ${result.passedTests}/${result.totalTests} passed (${result.successRate}%)`,
      );

      return result;
    } catch (error) {
      const result = {
        passed: false,
        error: error.message,
        score: 0,
      };

      console.log('  ❌ Tests: Failed');
      return result;
    }
  }

  async runSecurityScan() {
    if (!this.gateConfig.required.securityScan) {
      console.log('🔒 Security Scan: SKIPPED');
      return { skipped: true };
    }

    console.log('🔒 Running security scan...');

    try {
      const scanner = new SecurityScanner();
      const passed = await scanner.run({
        skipBundle: true, // Skip bundle scan for faster execution
      });

      // Calculate security score based on findings
      const findings = scanner.findings;
      const criticalIssues = findings.filter(
        (f) => f.severity === 'critical',
      ).length;
      const highIssues = findings.filter((f) => f.severity === 'high').length;
      const moderateIssues = findings.filter(
        (f) => f.severity === 'moderate',
      ).length;

      let score = 100;
      score -= criticalIssues * 40; // Critical issues heavily penalize
      score -= highIssues * 20; // High issues significantly penalize
      score -= moderateIssues * 5; // Moderate issues lightly penalize
      score = Math.max(0, score);

      const result = {
        passed: criticalIssues === 0 && highIssues === 0,
        findings,
        summary: {
          critical: criticalIssues,
          high: highIssues,
          moderate: moderateIssues,
          total: findings.length,
        },
        score,
        details: scanner.results,
      };

      this.results.securityScan = result;
      console.log(
        `  ✅ Security: ${findings.length} issues found (${criticalIssues} critical, ${highIssues} high)`,
      );

      return result;
    } catch (error) {
      const result = {
        passed: false,
        error: error.message,
        score: 0,
      };

      this.results.securityScan = result;
      console.log('  ❌ Security Scan: Failed');

      return result;
    }
  }

  async runAccessibilityTests() {
    if (!this.gateConfig.required.accessibilityTests) {
      console.log('♿ Accessibility Tests: SKIPPED');
      return { skipped: true };
    }

    console.log('♿ Running accessibility tests...');

    try {
      const checker = new AccessibilityChecker('http://localhost:5173');
      const passed = await checker.run({ generateReport: true });

      // Extract results from the checker
      const summary = checker.results.reduce(
        (acc, result) => {
          acc.totalTests += result.summary?.totalTests || 0;
          acc.passed += result.summary?.passed || 0;
          acc.critical += result.summary?.critical || 0;
          acc.major += result.summary?.major || 0;
          acc.minor += result.summary?.minor || 0;
          return acc;
        },
        { totalTests: 0, passed: 0, critical: 0, major: 0, minor: 0 },
      );

      // Calculate accessibility score
      const totalIssues = summary.critical + summary.major + summary.minor;
      let score =
        summary.totalTests > 0
          ? (summary.passed / summary.totalTests) * 100
          : 0;
      score -= summary.critical * 20; // Critical issues heavily penalize
      score -= summary.major * 10; // Major issues significantly penalize
      score -= summary.minor * 2; // Minor issues lightly penalize
      score = Math.max(0, score);

      const result = {
        passed: summary.critical === 0 && summary.major === 0,
        summary,
        score,
        results: checker.results,
      };

      this.results.accessibilityTests = result;
      console.log(
        `  ✅ Accessibility: ${summary.passed}/${summary.totalTests} tests passed`,
      );

      return result;
    } catch (error) {
      const result = {
        passed: false,
        error: error.message,
        score: 0,
      };

      this.results.accessibilityTests = result;
      console.log('  ❌ Accessibility Tests: Failed');

      return result;
    }
  }

  async runBuildValidation() {
    if (!this.gateConfig.required.buildValidation) {
      console.log('🏗️ Build Validation: SKIPPED');
      return { skipped: true };
    }

    console.log('🏗️ Running build validation...');

    try {
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: root,
        timeout: 300000, // 5 minute timeout
      });

      const buildTime = Date.now() - startTime;

      // Check if build directory exists and has files
      const distExists = existsSync(join(root, 'dist'));
      const hasFiles = distExists
        ? require('fs').readdirSync(join(root, 'dist')).length > 0
        : false;

      const result = {
        passed: distExists && hasFiles && !stderr.includes('error'),
        buildTime,
        distExists,
        hasFiles,
        warnings: (stdout.match(/warning/gi) || []).length,
        output: stdout,
        score: distExists && hasFiles ? 100 : 0,
      };

      this.results.buildValidation = result;
      console.log(`  ✅ Build: Completed in ${(buildTime / 1000).toFixed(2)}s`);

      return result;
    } catch (error) {
      const result = {
        passed: false,
        error: error.message,
        score: 0,
      };

      this.results.buildValidation = result;
      console.log('  ❌ Build: Failed');

      return result;
    }
  }

  async runPerformanceTests() {
    if (!this.gateConfig.required.performanceTests) {
      console.log('⚡ Performance Tests: SKIPPED');
      return { skipped: true };
    }

    console.log('⚡ Running performance tests...');

    try {
      const monitor = new PerformanceMonitor('http://localhost:5173');
      await monitor.run({ generateReport: true });

      // Extract performance metrics
      const avgMetrics = monitor.calculateAverageMetrics();

      // Calculate performance score based on Core Web Vitals
      let score = 100;
      if (avgMetrics.lcp > 2500)
        score -= 30; // Poor LCP
      else if (avgMetrics.lcp > 1200) score -= 15; // Needs improvement

      if (avgMetrics.fid > 100)
        score -= 25; // Poor FID
      else if (avgMetrics.fid > 50) score -= 10; // Needs improvement

      if (avgMetrics.cls > 0.25)
        score -= 25; // Poor CLS
      else if (avgMetrics.cls > 0.1) score -= 10; // Needs improvement

      score = Math.max(0, score);

      const result = {
        passed: score >= this.gateConfig.thresholds.performance,
        metrics: avgMetrics,
        score,
        results: monitor.results,
      };

      this.results.performanceTests = result;
      console.log(`  ✅ Performance: Score ${score.toFixed(0)}/100`);

      return result;
    } catch (error) {
      const result = {
        passed: false,
        error: error.message,
        score: 0,
      };

      this.results.performanceTests = result;
      console.log('  ❌ Performance Tests: Failed');

      return result;
    }
  }

  async runBundleAnalysis() {
    if (!this.gateConfig.required.bundleAnalysis) {
      console.log('📦 Bundle Analysis: SKIPPED');
      return { skipped: true };
    }

    console.log('📦 Running bundle analysis...');

    try {
      await execAsync('node tools/bundle-analyzer.js', {
        cwd: root,
        timeout: 30000,
      });

      // Read bundle analysis results if available
      const analysisPath = join(root, 'dist', 'bundle-analysis.json');
      let analysis = null;

      if (existsSync(analysisPath)) {
        analysis = JSON.parse(readFileSync(analysisPath, 'utf8'));
      }

      const result = {
        passed: true,
        analysis,
        score: 100, // Bundle analysis is informational
      };

      this.results.bundleAnalysis = result;
      console.log('  ✅ Bundle Analysis: Completed');

      return result;
    } catch (error) {
      const result = {
        passed: false,
        error: error.message,
        score: 0,
      };

      this.results.bundleAnalysis = result;
      console.log('  ❌ Bundle Analysis: Failed');

      return result;
    }
  }

  calculateQualityMetrics() {
    const results = this.results;

    // Code Quality (linting + type checking)
    let codeQualityScore = 0;
    let codeQualityCount = 0;

    if (results.linting && !results.linting.skipped) {
      codeQualityScore += results.linting.score;
      codeQualityCount++;
    }

    if (results.typeChecking && !results.typeChecking.skipped) {
      codeQualityScore += results.typeChecking.score;
      codeQualityCount++;
    }

    this.qualityMetrics.codeQuality =
      codeQualityCount > 0 ? codeQualityScore / codeQualityCount : 0;

    // Test Coverage (from unit tests primarily)
    if (results.unitTests?.coverage) {
      this.qualityMetrics.testCoverage = results.unitTests.coverage.statements;
    } else {
      // Fall back to test success rate
      const testResults = [
        results.unitTests,
        results.integrationTests,
        results.e2eTests,
      ].filter((r) => r && !r.skipped && r.tests);

      if (testResults.length > 0) {
        const totalTests = testResults.reduce(
          (acc, r) => acc + r.tests.total,
          0,
        );
        const passedTests = testResults.reduce(
          (acc, r) => acc + r.tests.passed,
          0,
        );
        this.qualityMetrics.testCoverage =
          totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      }
    }

    // Security Score
    this.qualityMetrics.security = results.securityScan?.score || 100;

    // Accessibility Score
    this.qualityMetrics.accessibility =
      results.accessibilityTests?.score || 100;

    // Performance Score
    this.qualityMetrics.performance = results.performanceTests?.score || 100;

    // Overall Quality Score (weighted average)
    const weights = {
      codeQuality: 0.25,
      testCoverage: 0.25,
      security: 0.2,
      accessibility: 0.15,
      performance: 0.15,
    };

    this.qualityMetrics.overall =
      this.qualityMetrics.codeQuality * weights.codeQuality +
      this.qualityMetrics.testCoverage * weights.testCoverage +
      this.qualityMetrics.security * weights.security +
      this.qualityMetrics.accessibility * weights.accessibility +
      this.qualityMetrics.performance * weights.performance;
  }

  evaluateQualityGate() {
    const thresholds = this.gateConfig.thresholds;
    const blocking = this.gateConfig.blocking;

    let passed = true;
    const failures = [];

    // Check blocking conditions
    if (blocking.buildFailures && !this.results.buildValidation?.passed) {
      passed = false;
      failures.push('Build validation failed');
    }

    if (
      blocking.lintingErrors &&
      this.results.linting &&
      !this.results.linting.passed
    ) {
      passed = false;
      failures.push('Linting errors found');
    }

    if (
      blocking.typeErrors &&
      this.results.typeChecking &&
      !this.results.typeChecking.passed
    ) {
      passed = false;
      failures.push('Type checking errors found');
    }

    if (
      blocking.criticalSecurityIssues &&
      this.results.securityScan?.summary?.critical > 0
    ) {
      passed = false;
      failures.push('Critical security issues found');
    }

    // Check quality thresholds
    if (this.qualityMetrics.codeQuality < thresholds.codeQuality) {
      passed = false;
      failures.push(
        `Code quality below threshold (${this.qualityMetrics.codeQuality.toFixed(1)} < ${thresholds.codeQuality})`,
      );
    }

    if (this.qualityMetrics.testCoverage < thresholds.testCoverage) {
      passed = false;
      failures.push(
        `Test coverage below threshold (${this.qualityMetrics.testCoverage.toFixed(1)}% < ${thresholds.testCoverage}%)`,
      );
    }

    if (this.qualityMetrics.security < thresholds.security) {
      passed = false;
      failures.push(
        `Security score below threshold (${this.qualityMetrics.security.toFixed(1)} < ${thresholds.security})`,
      );
    }

    if (this.qualityMetrics.overall < thresholds.overall) {
      passed = false;
      failures.push(
        `Overall quality below threshold (${this.qualityMetrics.overall.toFixed(1)} < ${thresholds.overall})`,
      );
    }

    return { passed, failures };
  }

  async generateReport() {
    console.log('📄 Generating quality gate report...');

    const totalDuration = Date.now() - this.startTime;
    const gateEvaluation = this.evaluateQualityGate();

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      environment: this.gateConfig.environment,
      passed: gateEvaluation.passed,
      failures: gateEvaluation.failures,
      qualityMetrics: this.qualityMetrics,
      thresholds: this.gateConfig.thresholds,
      results: this.results,
      summary: {
        totalChecks: Object.values(this.results).filter((r) => r && !r.skipped)
          .length,
        passedChecks: Object.values(this.results).filter(
          (r) => r && !r.skipped && r.passed,
        ).length,
        failedChecks: Object.values(this.results).filter(
          (r) => r && !r.skipped && !r.passed,
        ).length,
        skippedChecks: Object.values(this.results).filter((r) => r && r.skipped)
          .length,
      },
    };

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'quality-gate-report.json'),
      JSON.stringify(report, null, 2),
    );

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report);
    writeFileSync(join(this.reportDir, 'quality-gate-report.html'), htmlReport);

    return report;
  }

  generateHTMLReport(report) {
    const getScoreColor = (score) => {
      if (score >= 90) return '#28a745';
      if (score >= 80) return '#ffc107';
      if (score >= 70) return '#fd7e14';
      return '#dc3545';
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quality Gate Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .status { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 1.4em; font-weight: bold; }
        .status.passed { background: #d4edda; color: #155724; border: 2px solid #c3e6cb; }
        .status.failed { background: #f8d7da; color: #721c24; border: 2px solid #f5c6cb; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { font-size: 1em; color: #666; }
        .threshold { font-size: 0.8em; color: #999; margin-top: 5px; }
        .checks { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .check { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .check.passed { border-left: 4px solid #28a745; }
        .check.failed { border-left: 4px solid #dc3545; }
        .check.skipped { border-left: 4px solid #6c757d; }
        .check-header { font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .check-status { font-size: 1.2em; }
        .check-details { font-size: 0.9em; color: #666; }
        .failures { background: #f8d7da; padding: 20px; border-radius: 8px; border: 1px solid #f5c6cb; margin: 20px 0; }
        .failure-item { background: white; padding: 10px; border-radius: 4px; margin: 5px 0; border-left: 3px solid #dc3545; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-item { background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-value { font-size: 1.5em; font-weight: bold; color: #1976d2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏁 Quality Gate Report</h1>
            <p><strong>Environment:</strong> ${report.environment}</p>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Duration:</strong> ${(report.duration / 1000).toFixed(2)} seconds</p>
        </div>
        
        <div class="status ${report.passed ? 'passed' : 'failed'}">
            ${report.passed ? '✅ QUALITY GATE PASSED' : '❌ QUALITY GATE FAILED'}
        </div>
        
        ${
          !report.passed && report.failures.length > 0
            ? `
            <div class="failures">
                <h3>❌ Quality Gate Failures</h3>
                ${report.failures
                  .map(
                    (failure) => `
                    <div class="failure-item">${failure}</div>
                `,
                  )
                  .join('')}
            </div>
        `
            : ''
        }
        
        <h2>📊 Quality Metrics</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(report.qualityMetrics.codeQuality)}">
                    ${report.qualityMetrics.codeQuality.toFixed(1)}
                </div>
                <div class="metric-label">Code Quality</div>
                <div class="threshold">Threshold: ${report.thresholds.codeQuality}</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(report.qualityMetrics.testCoverage)}">
                    ${report.qualityMetrics.testCoverage.toFixed(1)}%
                </div>
                <div class="metric-label">Test Coverage</div>
                <div class="threshold">Threshold: ${report.thresholds.testCoverage}%</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(report.qualityMetrics.security)}">
                    ${report.qualityMetrics.security.toFixed(1)}
                </div>
                <div class="metric-label">Security Score</div>
                <div class="threshold">Threshold: ${report.thresholds.security}</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(report.qualityMetrics.accessibility)}">
                    ${report.qualityMetrics.accessibility.toFixed(1)}
                </div>
                <div class="metric-label">Accessibility</div>
                <div class="threshold">Threshold: ${report.thresholds.accessibility}</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(report.qualityMetrics.performance)}">
                    ${report.qualityMetrics.performance.toFixed(1)}
                </div>
                <div class="metric-label">Performance</div>
                <div class="threshold">Threshold: ${report.thresholds.performance}</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(report.qualityMetrics.overall)}">
                    ${report.qualityMetrics.overall.toFixed(1)}
                </div>
                <div class="metric-label">Overall Quality</div>
                <div class="threshold">Threshold: ${report.thresholds.overall}</div>
            </div>
        </div>
        
        <h2>📋 Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${report.summary.totalChecks}</div>
                <div>Total Checks</div>
            </div>
            <div class="summary-item">
                <div class="summary-value" style="color: #28a745">${report.summary.passedChecks}</div>
                <div>Passed</div>
            </div>
            <div class="summary-item">
                <div class="summary-value" style="color: #dc3545">${report.summary.failedChecks}</div>
                <div>Failed</div>
            </div>
            <div class="summary-item">
                <div class="summary-value" style="color: #6c757d">${report.summary.skippedChecks}</div>
                <div>Skipped</div>
            </div>
        </div>
        
        <h2>🔍 Detailed Results</h2>
        <div class="checks">
            ${Object.entries(report.results)
              .map(([checkName, result]) => {
                if (!result) return '';

                const status = result.skipped
                  ? 'skipped'
                  : result.passed
                    ? 'passed'
                    : 'failed';
                const statusIcon = result.skipped
                  ? '⏭️'
                  : result.passed
                    ? '✅'
                    : '❌';
                const statusText = result.skipped
                  ? 'SKIPPED'
                  : result.passed
                    ? 'PASSED'
                    : 'FAILED';

                return `
                <div class="check ${status}">
                    <div class="check-header">
                        <span>${checkName.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</span>
                        <span class="check-status">${statusIcon} ${statusText}</span>
                    </div>
                    <div class="check-details">
                        ${result.score !== undefined ? `<p><strong>Score:</strong> ${result.score.toFixed(1)}</p>` : ''}
                        ${result.errors !== undefined ? `<p><strong>Errors:</strong> ${result.errors}</p>` : ''}
                        ${result.warnings !== undefined ? `<p><strong>Warnings:</strong> ${result.warnings}</p>` : ''}
                        ${result.successRate !== undefined ? `<p><strong>Success Rate:</strong> ${result.successRate}%</p>` : ''}
                        ${result.summary ? `<p><strong>Issues:</strong> ${JSON.stringify(result.summary)}</p>` : ''}
                        ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                    </div>
                </div>
              `;
              })
              .join('')}
        </div>
    </div>
</body>
</html>
    `;
  }

  async run(options = {}) {
    const {
      skipTests = false,
      skipSecurity = false,
      skipAccessibility = false,
      skipPerformance = false,
      generateReport = true,
    } = options;

    try {
      await this.setup();

      console.log('🏁 Starting Quality Gate evaluation...\n');

      // Run all quality checks
      const checkPromises = [
        this.runLinting(),
        this.runTypeChecking(),
        this.runBuildValidation(),
      ];

      // Add optional checks based on configuration and options
      if (!skipTests) {
        checkPromises.push(this.runTests());
      }

      if (!skipSecurity) {
        checkPromises.push(this.runSecurityScan());
      }

      if (!skipAccessibility && this.gateConfig.required.accessibilityTests) {
        checkPromises.push(this.runAccessibilityTests());
      }

      if (!skipPerformance && this.gateConfig.required.performanceTests) {
        checkPromises.push(this.runPerformanceTests());
      }

      if (this.gateConfig.required.bundleAnalysis) {
        checkPromises.push(this.runBundleAnalysis());
      }

      // Run checks sequentially to avoid resource conflicts
      for (const checkPromise of checkPromises) {
        await checkPromise;
      }

      // Calculate quality metrics
      this.calculateQualityMetrics();

      // Generate report
      let report = null;
      if (generateReport) {
        report = await this.generateReport();
      }

      // Evaluate quality gate
      const gateEvaluation = this.evaluateQualityGate();

      console.log('\n🎯 Quality Gate Summary:');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      );
      console.log(
        `  Overall Status:       ${gateEvaluation.passed ? '✅ PASSED' : '❌ FAILED'}`,
      );
      console.log(
        `  Code Quality:         ${this.qualityMetrics.codeQuality.toFixed(1)}/100`,
      );
      console.log(
        `  Test Coverage:        ${this.qualityMetrics.testCoverage.toFixed(1)}%`,
      );
      console.log(
        `  Security Score:       ${this.qualityMetrics.security.toFixed(1)}/100`,
      );
      console.log(
        `  Accessibility:        ${this.qualityMetrics.accessibility.toFixed(1)}/100`,
      );
      console.log(
        `  Performance:          ${this.qualityMetrics.performance.toFixed(1)}/100`,
      );
      console.log(
        `  Overall Quality:      ${this.qualityMetrics.overall.toFixed(1)}/100`,
      );
      console.log(
        `  Duration:             ${((Date.now() - this.startTime) / 1000).toFixed(2)} seconds`,
      );

      if (!gateEvaluation.passed) {
        console.log('\n❌ Quality Gate Failures:');
        gateEvaluation.failures.forEach((failure) => {
          console.log(`  • ${failure}`);
        });
      }

      if (generateReport) {
        console.log(
          `\n📄 Detailed report: ${join('test-results', 'quality-gate', 'quality-gate-report.html')}`,
        );
      }

      return gateEvaluation.passed;
    } catch (error) {
      console.error('❌ Quality Gate execution failed:', error);
      return false;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    skipTests: args.includes('--skip-tests'),
    skipSecurity: args.includes('--skip-security'),
    skipAccessibility: args.includes('--skip-accessibility'),
    skipPerformance: args.includes('--skip-performance'),
    generateReport: !args.includes('--no-report'),
  };

  const gate = new QualityGate();
  gate
    .run(options)
    .then((passed) => {
      process.exit(passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('Quality Gate failed:', error);
      process.exit(1);
    });
}

export default QualityGate;
