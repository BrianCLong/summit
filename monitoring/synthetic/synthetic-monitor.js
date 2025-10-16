/**
 * Synthetic Monitoring for IntelGraph Platform
 *
 * Comprehensive synthetic monitoring using Playwright for end-to-end
 * user journey testing and API monitoring.
 */

import { chromium, Browser, Page } from 'playwright';
import axios from 'axios';
import { createPrometheusRegistry } from 'prom-client';

// Prometheus metrics
const promClient = createPrometheusRegistry();
const httpDuration = new promClient.Histogram({
  name: 'synthetic_http_request_duration_seconds',
  help: 'Duration of synthetic HTTP requests',
  labelNames: ['method', 'endpoint', 'status_code', 'environment'],
});

const httpSuccess = new promClient.Counter({
  name: 'synthetic_http_requests_total',
  help: 'Total synthetic HTTP requests',
  labelNames: ['method', 'endpoint', 'status', 'environment'],
});

const userJourneyDuration = new promClient.Histogram({
  name: 'synthetic_user_journey_duration_seconds',
  help: 'Duration of synthetic user journeys',
  labelNames: ['journey', 'step', 'status', 'environment'],
});

const userJourneySuccess = new promClient.Counter({
  name: 'synthetic_user_journey_total',
  help: 'Total synthetic user journey executions',
  labelNames: ['journey', 'status', 'environment'],
});

const slaViolation = new promClient.Counter({
  name: 'synthetic_sla_violations_total',
  help: 'Total SLA violations detected',
  labelNames: ['check_type', 'violation_type', 'environment'],
});

// Configuration
const config = {
  environment: process.env.ENVIRONMENT || 'production',
  baseUrl: process.env.BASE_URL || 'https://app.intelgraph.ai',
  apiUrl: process.env.API_URL || 'https://api.intelgraph.ai',
  timeout: parseInt(process.env.TIMEOUT || '30000'),
  interval: parseInt(process.env.INTERVAL || '60000'), // 1 minute
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  pushgateway:
    process.env.PROMETHEUS_PUSHGATEWAY || 'http://prometheus-pushgateway:9091',

  // SLA thresholds
  sla: {
    responseTime: parseInt(process.env.SLA_RESPONSE_TIME || '2000'), // 2 seconds
    availability: parseFloat(process.env.SLA_AVAILABILITY || '99.9'), // 99.9%
    pageLoadTime: parseInt(process.env.SLA_PAGE_LOAD_TIME || '3000'), // 3 seconds
  },

  // Test credentials
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'synthetic-test@intelgraph.ai',
    password: process.env.TEST_USER_PASSWORD || 'synthetic-test-password-123',
  },
};

/**
 * API Health Checks
 */
class APIMonitor {
  async checkHealthEndpoints() {
    const endpoints = [
      { name: 'health', path: '/health', method: 'GET' },
      { name: 'api-health', path: '/api/health', method: 'GET' },
      {
        name: 'graphql-health',
        path: '/graphql?query={__typename}',
        method: 'POST',
      },
      { name: 'maestro-health', path: '/api/maestro/v1/health', method: 'GET' },
    ];

    for (const endpoint of endpoints) {
      await this.checkEndpoint(endpoint);
    }
  }

  async checkEndpoint(endpoint) {
    const startTime = Date.now();
    let status = 'success';
    let statusCode = 0;

    try {
      const url = `${config.apiUrl}${endpoint.path}`;
      const response = await axios({
        method: endpoint.method,
        url,
        timeout: config.timeout,
        validateStatus: () => true, // Don't throw on 4xx/5xx
      });

      statusCode = response.status;
      const duration = (Date.now() - startTime) / 1000;

      // Check if response is healthy
      if (statusCode >= 400) {
        status = 'error';
      } else if (duration > config.sla.responseTime / 1000) {
        status = 'slow';
        slaViolation.inc({
          check_type: 'api',
          violation_type: 'response_time',
          environment: config.environment,
        });
      }

      // Record metrics
      httpDuration.observe(
        {
          method: endpoint.method,
          endpoint: endpoint.name,
          status_code: statusCode,
          environment: config.environment,
        },
        duration,
      );

      httpSuccess.inc({
        method: endpoint.method,
        endpoint: endpoint.name,
        status,
        environment: config.environment,
      });

      console.log(
        `[${new Date().toISOString()}] API Check - ${endpoint.name}: ${statusCode} (${duration.toFixed(2)}s) - ${status}`,
      );

      // Send alert for failures
      if (status === 'error') {
        await this.sendAlert({
          type: 'api_failure',
          endpoint: endpoint.name,
          statusCode,
          duration,
          message: `API endpoint ${endpoint.name} returned ${statusCode}`,
        });
      }
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      status = 'error';

      httpSuccess.inc({
        method: endpoint.method,
        endpoint: endpoint.name,
        status: 'error',
        environment: config.environment,
      });

      console.error(
        `[${new Date().toISOString()}] API Check - ${endpoint.name}: ERROR (${duration.toFixed(2)}s) - ${error.message}`,
      );

      await this.sendAlert({
        type: 'api_error',
        endpoint: endpoint.name,
        duration,
        error: error.message,
      });
    }
  }

  async sendAlert(alert) {
    if (!config.slackWebhook) return;

    const message = {
      text:
        `🚨 *Synthetic Monitor Alert*\n` +
        `Environment: ${config.environment}\n` +
        `Type: ${alert.type}\n` +
        `Endpoint: ${alert.endpoint}\n` +
        `${alert.statusCode ? `Status Code: ${alert.statusCode}\n` : ''}` +
        `Duration: ${alert.duration.toFixed(2)}s\n` +
        `${alert.error ? `Error: ${alert.error}\n` : ''}` +
        `${alert.message || ''}`,
      username: 'IntelGraph Synthetic Monitor',
      icon_emoji: ':warning:',
    };

    try {
      await axios.post(config.slackWebhook, message);
    } catch (error) {
      console.error('Failed to send Slack alert:', error.message);
    }
  }
}

/**
 * User Journey Monitoring
 */
class UserJourneyMonitor {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
      ],
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllJourneys() {
    try {
      await this.initialize();

      const journeys = [
        'login_flow',
        'dashboard_load',
        'graph_navigation',
        'search_functionality',
        'maestro_pipeline_view',
      ];

      for (const journeyName of journeys) {
        await this.runJourney(journeyName);
      }
    } finally {
      await this.cleanup();
    }
  }

  async runJourney(journeyName) {
    const startTime = Date.now();
    let status = 'success';
    let currentStep = 'init';

    try {
      console.log(
        `[${new Date().toISOString()}] Starting journey: ${journeyName}`,
      );

      switch (journeyName) {
        case 'login_flow':
          await this.testLoginFlow();
          break;
        case 'dashboard_load':
          await this.testDashboardLoad();
          break;
        case 'graph_navigation':
          await this.testGraphNavigation();
          break;
        case 'search_functionality':
          await this.testSearchFunctionality();
          break;
        case 'maestro_pipeline_view':
          await this.testMaestroPipelineView();
          break;
        default:
          throw new Error(`Unknown journey: ${journeyName}`);
      }

      const duration = (Date.now() - startTime) / 1000;

      // Check SLA
      if (duration > config.sla.pageLoadTime / 1000) {
        status = 'slow';
        slaViolation.inc({
          check_type: 'user_journey',
          violation_type: 'duration',
          environment: config.environment,
        });
      }

      userJourneyDuration.observe(
        {
          journey: journeyName,
          step: 'complete',
          status,
          environment: config.environment,
        },
        duration,
      );

      userJourneySuccess.inc({
        journey: journeyName,
        status,
        environment: config.environment,
      });

      console.log(
        `[${new Date().toISOString()}] Journey ${journeyName}: ${status} (${duration.toFixed(2)}s)`,
      );
    } catch (error) {
      status = 'error';
      const duration = (Date.now() - startTime) / 1000;

      userJourneySuccess.inc({
        journey: journeyName,
        status: 'error',
        environment: config.environment,
      });

      console.error(
        `[${new Date().toISOString()}] Journey ${journeyName}: ERROR (${duration.toFixed(2)}s) - ${error.message}`,
      );

      await this.sendJourneyAlert({
        journey: journeyName,
        step: currentStep,
        duration,
        error: error.message,
      });
    }
  }

  async testLoginFlow() {
    const page = await this.browser.newPage();

    try {
      // Navigate to login page
      await page.goto(`${config.baseUrl}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout,
      });

      // Wait for login form
      await page.waitForSelector('[data-testid="login-form"]', {
        timeout: 10000,
      });

      // Fill credentials
      await page.fill('[data-testid="email-input"]', config.testUser.email);
      await page.fill(
        '[data-testid="password-input"]',
        config.testUser.password,
      );

      // Submit login
      await page.click('[data-testid="login-button"]');

      // Wait for successful redirect
      await page.waitForURL('**/dashboard', { timeout: 15000 });

      // Verify dashboard elements
      await page.waitForSelector('[data-testid="dashboard"]', {
        timeout: 10000,
      });
    } finally {
      await page.close();
    }
  }

  async testDashboardLoad() {
    const page = await this.browser.newPage();

    try {
      // Navigate directly to dashboard (assumes auth token is set)
      await page.goto(`${config.baseUrl}/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout,
      });

      // Wait for key dashboard elements
      await Promise.all([
        page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 }),
        page.waitForSelector('[data-testid="navigation"]', { timeout: 10000 }),
        page.waitForSelector('[data-testid="main-content"]', {
          timeout: 10000,
        }),
      ]);

      // Check for JavaScript errors
      const jsErrors = [];
      page.on('pageerror', (error) => jsErrors.push(error.message));

      await page.waitForTimeout(2000); // Wait for potential JS errors

      if (jsErrors.length > 0) {
        throw new Error(`JavaScript errors detected: ${jsErrors.join(', ')}`);
      }
    } finally {
      await page.close();
    }
  }

  async testGraphNavigation() {
    const page = await this.browser.newPage();

    try {
      await page.goto(`${config.baseUrl}/graph`, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout,
      });

      // Wait for graph container
      await page.waitForSelector('[data-testid="graph-container"]', {
        timeout: 15000,
      });

      // Wait for graph to render
      await page.waitForFunction(
        () => {
          const container = document.querySelector(
            '[data-testid="graph-container"]',
          );
          return container && container.children.length > 0;
        },
        { timeout: 15000 },
      );

      // Test basic interactions
      await page.click(
        '[data-testid="graph-controls"] button[title="Zoom In"]',
      );
      await page.click(
        '[data-testid="graph-controls"] button[title="Zoom Out"]',
      );
    } finally {
      await page.close();
    }
  }

  async testSearchFunctionality() {
    const page = await this.browser.newPage();

    try {
      await page.goto(`${config.baseUrl}/search`, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout,
      });

      // Wait for search input
      await page.waitForSelector('[data-testid="search-input"]', {
        timeout: 10000,
      });

      // Perform search
      await page.fill('[data-testid="search-input"]', 'test query');
      await page.press('[data-testid="search-input"]', 'Enter');

      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]', {
        timeout: 10000,
      });
    } finally {
      await page.close();
    }
  }

  async testMaestroPipelineView() {
    const page = await this.browser.newPage();

    try {
      await page.goto(`${config.baseUrl}/maestro/pipelines`, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout,
      });

      // Wait for pipeline list
      await page.waitForSelector('[data-testid="pipeline-list"]', {
        timeout: 10000,
      });

      // Check if pipelines are loaded
      const pipelineCount = await page
        .locator('[data-testid="pipeline-item"]')
        .count();

      // If pipelines exist, test viewing one
      if (pipelineCount > 0) {
        await page.click('[data-testid="pipeline-item"]');
        await page.waitForSelector('[data-testid="pipeline-details"]', {
          timeout: 10000,
        });
      }
    } finally {
      await page.close();
    }
  }

  async sendJourneyAlert(alert) {
    if (!config.slackWebhook) return;

    const message = {
      text:
        `🔍 *User Journey Alert*\n` +
        `Environment: ${config.environment}\n` +
        `Journey: ${alert.journey}\n` +
        `Step: ${alert.step}\n` +
        `Duration: ${alert.duration.toFixed(2)}s\n` +
        `Error: ${alert.error}`,
      username: 'IntelGraph Synthetic Monitor',
      icon_emoji: ':mag:',
    };

    try {
      await axios.post(config.slackWebhook, message);
    } catch (error) {
      console.error('Failed to send journey alert:', error.message);
    }
  }
}

/**
 * Metrics Reporter
 */
class MetricsReporter {
  async pushMetrics() {
    if (!config.pushgateway) return;

    try {
      const metrics = promClient.register.metrics();

      await axios.post(
        `${config.pushgateway}/metrics/job/synthetic-monitoring/instance/${config.environment}`,
        metrics,
        {
          headers: {
            'Content-Type': 'text/plain',
          },
        },
      );

      console.log(`[${new Date().toISOString()}] Metrics pushed to Prometheus`);
    } catch (error) {
      console.error('Failed to push metrics:', error.message);
    }
  }
}

/**
 * Main Monitoring Loop
 */
class SyntheticMonitor {
  constructor() {
    this.apiMonitor = new APIMonitor();
    this.journeyMonitor = new UserJourneyMonitor();
    this.metricsReporter = new MetricsReporter();
    this.isRunning = false;
  }

  async start() {
    console.log(
      `[${new Date().toISOString()}] Starting Synthetic Monitor for ${config.environment}`,
    );
    console.log(`Base URL: ${config.baseUrl}`);
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`Interval: ${config.interval}ms`);

    this.isRunning = true;

    // Run initial checks
    await this.runChecks();

    // Set up interval
    this.interval = setInterval(async () => {
      if (this.isRunning) {
        await this.runChecks();
      }
    }, config.interval);

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  async runChecks() {
    try {
      console.log(`[${new Date().toISOString()}] Running synthetic checks...`);

      // Run API health checks
      await this.apiMonitor.checkHealthEndpoints();

      // Run user journey tests (less frequently)
      const shouldRunJourneys =
        Date.now() % (config.interval * 5) < config.interval;
      if (shouldRunJourneys) {
        await this.journeyMonitor.runAllJourneys();
      }

      // Push metrics
      await this.metricsReporter.pushMetrics();

      console.log(`[${new Date().toISOString()}] Checks completed`);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error during checks:`,
        error,
      );
    }
  }

  async stop() {
    console.log(`[${new Date().toISOString()}] Stopping Synthetic Monitor...`);

    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
    }

    await this.journeyMonitor.cleanup();

    process.exit(0);
  }
}

// Start the monitor if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new SyntheticMonitor();
  monitor.start().catch((error) => {
    console.error('Failed to start synthetic monitor:', error);
    process.exit(1);
  });
}

export { SyntheticMonitor, APIMonitor, UserJourneyMonitor, MetricsReporter };
