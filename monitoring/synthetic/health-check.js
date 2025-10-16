/**
 * Health Check Script for Synthetic Monitoring
 *
 * Provides health endpoint and status checks for the synthetic monitoring service.
 */

import http from 'http';
import { URL } from 'url';
import axios from 'axios';

const config = {
  port: parseInt(process.env.PORT || '3000'),
  baseUrl: process.env.BASE_URL || 'http://intelgraph-server:3000',
  timeout: parseInt(process.env.TIMEOUT || '5000'),
};

class HealthCheckServer {
  constructor() {
    this.lastSuccessfulCheck = null;
    this.isHealthy = true;
    this.checks = new Map();

    this.startHealthChecks();
  }

  async startHealthChecks() {
    // Run health checks every 30 seconds
    setInterval(async () => {
      await this.runHealthChecks();
    }, 30000);

    // Run initial check
    await this.runHealthChecks();
  }

  async runHealthChecks() {
    const checks = [
      { name: 'api_health', url: `${config.baseUrl}/health` },
      {
        name: 'graphql_health',
        url: `${config.baseUrl}/graphql?query={__typename}`,
      },
    ];

    let allHealthy = true;

    for (const check of checks) {
      try {
        const startTime = Date.now();
        const response = await axios.get(check.url, {
          timeout: config.timeout,
          validateStatus: (status) => status < 500,
        });

        const duration = Date.now() - startTime;
        const healthy = response.status >= 200 && response.status < 400;

        this.checks.set(check.name, {
          healthy,
          status: response.status,
          duration,
          lastCheck: new Date(),
          error: null,
        });

        if (!healthy) {
          allHealthy = false;
        }
      } catch (error) {
        this.checks.set(check.name, {
          healthy: false,
          status: 0,
          duration: config.timeout,
          lastCheck: new Date(),
          error: error.message,
        });
        allHealthy = false;
      }
    }

    this.isHealthy = allHealthy;
    if (allHealthy) {
      this.lastSuccessfulCheck = new Date();
    }
  }

  getHealthStatus() {
    const checksArray = Array.from(this.checks.entries()).map(
      ([name, check]) => ({
        name,
        ...check,
      }),
    );

    return {
      healthy: this.isHealthy,
      timestamp: new Date().toISOString(),
      lastSuccessfulCheck: this.lastSuccessfulCheck?.toISOString() || null,
      uptime: process.uptime(),
      checks: checksArray,
      memory: process.memoryUsage(),
      version: process.version,
    };
  }

  getMetrics() {
    const healthStatus = this.getHealthStatus();
    const metrics = [];

    // Health status metric
    metrics.push(
      `synthetic_monitor_healthy{environment="${process.env.ENVIRONMENT || 'production'}"} ${healthStatus.healthy ? 1 : 0}`,
    );

    // Uptime metric
    metrics.push(
      `synthetic_monitor_uptime_seconds{environment="${process.env.ENVIRONMENT || 'production'}"} ${healthStatus.uptime}`,
    );

    // Memory metrics
    metrics.push(
      `synthetic_monitor_memory_used_bytes{type="rss",environment="${process.env.ENVIRONMENT || 'production'}"} ${healthStatus.memory.rss}`,
    );
    metrics.push(
      `synthetic_monitor_memory_used_bytes{type="heapUsed",environment="${process.env.ENVIRONMENT || 'production'}"} ${healthStatus.memory.heapUsed}`,
    );
    metrics.push(
      `synthetic_monitor_memory_used_bytes{type="heapTotal",environment="${process.env.ENVIRONMENT || 'production'}"} ${healthStatus.memory.heapTotal}`,
    );

    // Individual check metrics
    for (const check of healthStatus.checks) {
      metrics.push(
        `synthetic_monitor_check_healthy{check="${check.name}",environment="${process.env.ENVIRONMENT || 'production'}"} ${check.healthy ? 1 : 0}`,
      );
      metrics.push(
        `synthetic_monitor_check_duration_seconds{check="${check.name}",environment="${process.env.ENVIRONMENT || 'production'}"} ${check.duration / 1000}`,
      );
      metrics.push(
        `synthetic_monitor_check_status_code{check="${check.name}",environment="${process.env.ENVIRONMENT || 'production'}"} ${check.status}`,
      );
    }

    return metrics.join('\n') + '\n';
  }

  start() {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${config.port}`);

      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        switch (url.pathname) {
          case '/health':
            const healthStatus = this.getHealthStatus();
            res.writeHead(healthStatus.healthy ? 200 : 503, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify(healthStatus, null, 2));
            break;

          case '/metrics':
            const metrics = this.getMetrics();
            res.writeHead(200, {
              'Content-Type': 'text/plain',
            });
            res.end(metrics);
            break;

          case '/ready':
            // Readiness probe - check if we've had at least one successful check
            const ready = this.lastSuccessfulCheck !== null;
            res.writeHead(ready ? 200 : 503, {
              'Content-Type': 'application/json',
            });
            res.end(
              JSON.stringify({
                ready,
                lastSuccessfulCheck:
                  this.lastSuccessfulCheck?.toISOString() || null,
              }),
            );
            break;

          case '/live':
            // Liveness probe - basic service responsiveness
            res.writeHead(200, {
              'Content-Type': 'application/json',
            });
            res.end(
              JSON.stringify({
                alive: true,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
              }),
            );
            break;

          default:
            res.writeHead(404, {
              'Content-Type': 'application/json',
            });
            res.end(
              JSON.stringify({
                error: 'Not Found',
                endpoints: ['/health', '/metrics', '/ready', '/live'],
              }),
            );
        }
      } catch (error) {
        console.error('Health check server error:', error);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(
          JSON.stringify({
            error: 'Internal Server Error',
            message: error.message,
          }),
        );
      }
    });

    server.listen(config.port, () => {
      console.log(`Health check server listening on port ${config.port}`);
      console.log(`Health endpoint: http://localhost:${config.port}/health`);
      console.log(`Metrics endpoint: http://localhost:${config.port}/metrics`);
      console.log(`Ready endpoint: http://localhost:${config.port}/ready`);
      console.log(`Live endpoint: http://localhost:${config.port}/live`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully');
      server.close(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully');
      server.close(() => {
        process.exit(0);
      });
    });

    return server;
  }
}

// Start health check server if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const healthCheckServer = new HealthCheckServer();
  healthCheckServer.start();
}

export { HealthCheckServer };
