#!/usr/bin/env node

/**
 * Application Health Checker and Monitoring Tool
 * Comprehensive health checks for the Maestro application
 */

import fetch from 'node-fetch';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

class HealthChecker {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.results = [];
    this.reportDir = 'health-reports';
    this.timeout = 10000; // 10 second timeout
  }

  async setup() {
    console.log('🏥 Setting up health checker...');

    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async checkEndpoint(name, path, expectedStatus = 200, options = {}) {
    const {
      timeout = this.timeout,
      headers = {},
      method = 'GET',
      body = null,
      contentType = null,
    } = options;

    const url = `${this.baseUrl}${path}`;
    const startTime = Date.now();

    try {
      const fetchOptions = {
        method,
        headers: {
          'User-Agent': 'Maestro-Health-Checker/1.0',
          ...headers,
        },
        timeout,
      };

      if (body) {
        fetchOptions.body =
          typeof body === 'object' ? JSON.stringify(body) : body;
        if (contentType) {
          fetchOptions.headers['Content-Type'] = contentType;
        }
      }

      const response = await fetch(url, fetchOptions);
      const duration = Date.now() - startTime;

      const result = {
        name,
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        duration,
        timestamp: new Date().toISOString(),
        passed: response.status === expectedStatus,
        headers: Object.fromEntries(response.headers.entries()),
        size: parseInt(response.headers.get('content-length') || '0'),
      };

      // Try to get response body for analysis
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          result.responseBody = await response.json();
        } else if (contentType?.includes('text/')) {
          result.responseText = await response.text();
          result.responseLength = result.responseText.length;
        }
      } catch (bodyError) {
        result.bodyError = bodyError.message;
      }

      this.results.push(result);

      const statusIcon = result.passed ? '✅' : '❌';
      console.log(`  ${statusIcon} ${name}: ${result.status} (${duration}ms)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        name,
        url,
        method,
        status: 0,
        duration,
        timestamp: new Date().toISOString(),
        passed: false,
        error: error.message,
        errorType: error.name,
      };

      this.results.push(result);
      console.log(`  ❌ ${name}: ${error.message} (${duration}ms)`);

      return result;
    }
  }

  async checkFrontendRoutes() {
    console.log('🌐 Checking frontend routes...');

    const routes = [
      { name: 'Root Redirect', path: '/', expectedStatus: 200 },
      { name: 'Maestro App', path: '/maestro', expectedStatus: 200 },
      { name: 'Login Page', path: '/maestro/login', expectedStatus: 200 },
      {
        name: 'Auth Callback',
        path: '/maestro/auth/callback',
        expectedStatus: 200,
      },
      { name: 'Dashboard', path: '/maestro/', expectedStatus: 200 },
      { name: 'Runs List', path: '/maestro/runs', expectedStatus: 200 },
      {
        name: 'Observability',
        path: '/maestro/observability',
        expectedStatus: 200,
      },
      { name: 'Routing Studio', path: '/maestro/routing', expectedStatus: 200 },
      { name: 'Secrets', path: '/maestro/secrets', expectedStatus: 200 },
      { name: 'Admin', path: '/maestro/admin', expectedStatus: 200 },
    ];

    for (const route of routes) {
      await this.checkEndpoint(route.name, route.path, route.expectedStatus);
    }
  }

  async checkStaticAssets() {
    console.log('📦 Checking static assets...');

    const assets = [
      {
        name: 'Main CSS',
        path: '/maestro/assets/index.css',
        expectedStatus: 200,
      },
      {
        name: 'Main JS Bundle',
        path: '/maestro/assets/index.js',
        expectedStatus: 200,
      },
      { name: 'Favicon', path: '/favicon.ico', expectedStatus: 200 },
      {
        name: 'Build Manifest',
        path: '/maestro/build-manifest.json',
        expectedStatus: 200,
      },
    ];

    for (const asset of assets) {
      await this.checkEndpoint(asset.name, asset.path, asset.expectedStatus);
    }
  }

  async checkAPIEndpoints() {
    console.log('🔌 Checking API endpoints...');

    const apiBase = this.baseUrl.replace('5173', '3001'); // Assume API on port 3001

    const endpoints = [
      {
        name: 'API Health',
        path: '/api/maestro/v1/health',
        expectedStatus: 200,
      },
      {
        name: 'API Summary',
        path: '/api/maestro/v1/summary',
        expectedStatus: 200,
      },
      { name: 'API Runs', path: '/api/maestro/v1/runs', expectedStatus: 200 },
      {
        name: 'API Pipelines',
        path: '/api/maestro/v1/pipelines',
        expectedStatus: 200,
      },
      {
        name: 'GraphQL Endpoint',
        path: '/api/graphql',
        expectedStatus: 200,
        options: {
          method: 'POST',
          body: { query: '{ __schema { queryType { name } } }' },
          contentType: 'application/json',
        },
      },
    ];

    for (const endpoint of endpoints) {
      const url = endpoint.path.startsWith('/api')
        ? `${apiBase}${endpoint.path}`
        : `${this.baseUrl}${endpoint.path}`;

      await this.checkEndpoint(
        endpoint.name,
        endpoint.path,
        endpoint.expectedStatus,
        {
          ...endpoint.options,
          timeout: 5000, // Shorter timeout for API calls
        },
      );
    }
  }

  async checkSecurity() {
    console.log('🔒 Checking security headers...');

    const securityChecks = [
      {
        name: 'Security Headers',
        path: '/maestro',
        checker: (result) => {
          const headers = result.headers;
          const issues = [];

          if (!headers['strict-transport-security']) {
            issues.push('Missing HSTS header');
          }
          if (
            !headers['x-frame-options'] &&
            !headers['content-security-policy']
          ) {
            issues.push('Missing clickjacking protection');
          }
          if (!headers['x-content-type-options']) {
            issues.push('Missing X-Content-Type-Options header');
          }
          if (!headers['referrer-policy']) {
            issues.push('Missing Referrer-Policy header');
          }

          return {
            passed: issues.length === 0,
            issues,
            score: Math.max(0, 100 - issues.length * 25),
          };
        },
      },
    ];

    for (const check of securityChecks) {
      const result = await this.checkEndpoint(check.name, check.path);
      if (result && check.checker) {
        const securityResult = check.checker(result);
        result.security = securityResult;

        if (securityResult.issues.length > 0) {
          console.log(`    ⚠️  Security issues found:`);
          securityResult.issues.forEach((issue) => {
            console.log(`      - ${issue}`);
          });
        }
      }
    }
  }

  async checkPerformanceBasics() {
    console.log('⚡ Checking basic performance metrics...');

    const checks = [
      { name: 'Page Load Speed', path: '/maestro', maxDuration: 3000 },
      {
        name: 'API Response Time',
        path: '/api/maestro/v1/health',
        maxDuration: 1000,
      },
      {
        name: 'Asset Load Speed',
        path: '/maestro/assets/index.js',
        maxDuration: 2000,
      },
    ];

    for (const check of checks) {
      const result = await this.checkEndpoint(check.name, check.path);
      if (result) {
        result.performanceCheck = {
          passed: result.duration <= check.maxDuration,
          maxDuration: check.maxDuration,
          actualDuration: result.duration,
          score: Math.max(
            0,
            100 - Math.floor((result.duration / check.maxDuration) * 100),
          ),
        };

        if (result.duration > check.maxDuration) {
          console.log(
            `    ⚠️  Slow response: ${result.duration}ms (max: ${check.maxDuration}ms)`,
          );
        }
      }
    }
  }

  async checkDependencies() {
    console.log('🔗 Checking external dependencies...');

    const dependencies = [
      {
        name: 'CDN Health',
        url: 'https://cdn.jsdelivr.net/npm/react@18/package.json',
      },
      {
        name: 'Google Fonts',
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
      // Add other external dependencies as needed
    ];

    for (const dep of dependencies) {
      const startTime = Date.now();
      try {
        const response = await fetch(dep.url, { timeout: 5000 });
        const duration = Date.now() - startTime;

        const result = {
          name: dep.name,
          url: dep.url,
          status: response.status,
          duration,
          timestamp: new Date().toISOString(),
          passed: response.ok,
        };

        this.results.push(result);
        console.log(
          `  ${response.ok ? '✅' : '❌'} ${dep.name}: ${response.status} (${duration}ms)`,
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        const result = {
          name: dep.name,
          url: dep.url,
          status: 0,
          duration,
          timestamp: new Date().toISOString(),
          passed: false,
          error: error.message,
        };

        this.results.push(result);
        console.log(`  ❌ ${dep.name}: ${error.message} (${duration}ms)`);
      }
    }
  }

  calculateHealthScore() {
    const totalChecks = this.results.length;
    const passedChecks = this.results.filter((r) => r.passed).length;
    const baseScore = Math.round((passedChecks / totalChecks) * 100);

    // Adjust score based on critical failures
    let adjustedScore = baseScore;
    const criticalEndpoints = ['Maestro App', 'API Health'];
    const failedCritical = this.results.filter(
      (r) => criticalEndpoints.includes(r.name) && !r.passed,
    ).length;

    if (failedCritical > 0) {
      adjustedScore = Math.max(0, adjustedScore - failedCritical * 30);
    }

    return adjustedScore;
  }

  generateReport() {
    console.log('📄 Generating health report...');

    const healthScore = this.calculateHealthScore();
    const summary = {
      total: this.results.length,
      passed: this.results.filter((r) => r.passed).length,
      failed: this.results.filter((r) => !r.passed).length,
      averageResponseTime: Math.round(
        this.results.reduce((sum, r) => sum + r.duration, 0) /
          this.results.length,
      ),
    };

    const report = {
      timestamp: new Date().toISOString(),
      healthScore,
      summary,
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Write JSON report
    const jsonPath = join(this.reportDir, 'health-report.json');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Write HTML report
    const htmlPath = join(this.reportDir, 'health-report.html');
    writeFileSync(htmlPath, this.generateHTMLReport(report));

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedResults = this.results.filter((r) => !r.passed);

    // Critical endpoint failures
    const criticalFailures = failedResults.filter((r) =>
      ['Maestro App', 'API Health', 'Main JS Bundle'].includes(r.name),
    );
    if (criticalFailures.length > 0) {
      recommendations.push({
        type: 'Critical',
        severity: 'high',
        message: `Critical endpoints are failing: ${criticalFailures.map((r) => r.name).join(', ')}`,
        action: 'Investigate server configuration and deployment status',
      });
    }

    // Performance issues
    const slowResponses = this.results.filter((r) => r.duration > 3000);
    if (slowResponses.length > 0) {
      recommendations.push({
        type: 'Performance',
        severity: 'medium',
        message: `${slowResponses.length} endpoints have slow response times`,
        action: 'Optimize server performance and consider CDN implementation',
      });
    }

    // Security issues
    const securityIssues = this.results.filter(
      (r) => r.security?.issues?.length > 0,
    );
    if (securityIssues.length > 0) {
      const allIssues = securityIssues.flatMap((r) => r.security.issues);
      recommendations.push({
        type: 'Security',
        severity: 'high',
        message: `Security headers missing: ${[...new Set(allIssues)].join(', ')}`,
        action: 'Configure proper security headers in web server',
      });
    }

    return recommendations;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Health Check Report</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 40px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .health-score { text-align: center; margin: 20px 0; }
        .score-circle { 
            display: inline-block; width: 120px; height: 120px; border-radius: 50%;
            background: conic-gradient(
                ${report.healthScore >= 90 ? '#28a745' : report.healthScore >= 70 ? '#ffc107' : '#dc3545'} ${report.healthScore * 3.6}deg, 
                #f8f9fa 0
            );
            display: flex; align-items: center; justify-content: center;
            font-size: 2em; font-weight: bold; 
            color: ${report.healthScore >= 90 ? '#28a745' : report.healthScore >= 70 ? '#ffc107' : '#dc3545'};
        }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 1.5em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { font-size: 0.9em; color: #666; }
        .results-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .results-table th, .results-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .results-table th { background: #f8f9fa; font-weight: bold; }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .severity-high { border-left: 4px solid #dc3545; }
        .severity-medium { border-left: 4px solid #ffc107; }
        .severity-low { border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Maestro Health Check Report</h1>
            <p>Generated: ${report.timestamp}</p>
        </div>
        
        <div class="health-score">
            <div class="score-circle">
                <div>${report.healthScore}</div>
            </div>
            <h2>Overall Health Score</h2>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.total}</div>
                <div class="metric-label">Total Checks</div>
            </div>
            <div class="metric">
                <div class="metric-value status-passed">${report.summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value status-failed">${report.summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.averageResponseTime}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
        </div>

        ${
          report.recommendations.length > 0
            ? `
            <div class="recommendations">
                <h3>⚠️ Recommendations</h3>
                ${report.recommendations
                  .map(
                    (rec) => `
                    <div class="recommendation severity-${rec.severity}">
                        <strong>${rec.type}:</strong> ${rec.message}<br>
                        <small><strong>Action:</strong> ${rec.action}</small>
                    </div>
                `,
                  )
                  .join('')}
            </div>
        `
            : ''
        }

        <table class="results-table">
            <thead>
                <tr>
                    <th>Check Name</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${report.results
                  .map(
                    (result) => `
                    <tr>
                        <td>${result.name}</td>
                        <td class="${result.passed ? 'status-passed' : 'status-failed'}">
                            ${result.passed ? '✅ PASSED' : '❌ FAILED'}
                        </td>
                        <td>${result.duration}ms</td>
                        <td>
                            ${result.status ? `HTTP ${result.status}` : 'Connection Error'}
                            ${result.error ? `<br><small>${result.error}</small>` : ''}
                            ${result.security?.issues?.length > 0 ? `<br><small>Security issues: ${result.security.issues.length}</small>` : ''}
                        </td>
                    </tr>
                `,
                  )
                  .join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
    `;
  }

  async runHealthCheck() {
    try {
      await this.setup();

      console.log('🏥 Starting comprehensive health check...\n');

      await this.checkFrontendRoutes();
      await this.checkStaticAssets();
      await this.checkAPIEndpoints();
      await this.checkSecurity();
      await this.checkPerformanceBasics();
      await this.checkDependencies();

      const report = this.generateReport();

      console.log('\n📋 Health Check Summary:');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      );
      console.log(`  Overall Health:     ${report.healthScore}/100`);
      console.log(
        `  Checks Passed:      ${report.summary.passed}/${report.summary.total}`,
      );
      console.log(
        `  Avg Response Time:  ${report.summary.averageResponseTime}ms`,
      );
      console.log(
        `  Critical Issues:    ${report.recommendations.filter((r) => r.severity === 'high').length}`,
      );

      if (report.recommendations.length > 0) {
        console.log('\n⚠️ Issues Found:');
        report.recommendations.forEach((rec) => {
          const icon =
            rec.severity === 'high'
              ? '🔴'
              : rec.severity === 'medium'
                ? '🟡'
                : '🟢';
          console.log(`  ${icon} ${rec.type}: ${rec.message}`);
        });
      }

      console.log(
        `\n📄 Full report: ${join(this.reportDir, 'health-report.html')}`,
      );

      return report;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const baseUrl =
    args.find((arg) => arg.startsWith('--base-url='))?.split('=')[1] ||
    'http://localhost:5173';

  const checker = new HealthChecker(baseUrl);
  checker
    .runHealthCheck()
    .then((report) => {
      process.exit(report.healthScore < 70 ? 1 : 0);
    })
    .catch(console.error);
}

export default HealthChecker;
