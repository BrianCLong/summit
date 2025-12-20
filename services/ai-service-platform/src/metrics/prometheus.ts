/**
 * Prometheus Metrics
 */

import type { FastifyInstance } from 'fastify';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

// Service metrics
export const serviceDeployments = new Counter({
  name: 'ai_platform_deployments_total',
  help: 'Total number of service deployments',
  labelNames: ['environment', 'status', 'type'],
  registers: [register],
});

export const deploymentDuration = new Histogram({
  name: 'ai_platform_deployment_duration_seconds',
  help: 'Time to deploy a service',
  labelNames: ['environment', 'type'],
  buckets: [5, 15, 30, 60, 120, 300],
  registers: [register],
});

export const activeServices = new Gauge({
  name: 'ai_platform_active_services',
  help: 'Number of active services',
  labelNames: ['type', 'environment'],
  registers: [register],
});

export const complianceChecks = new Counter({
  name: 'ai_platform_compliance_checks_total',
  help: 'Total compliance checks performed',
  labelNames: ['framework', 'result'],
  registers: [register],
});

export const requestLatency = new Histogram({
  name: 'ai_platform_request_latency_ms',
  help: 'Request latency in milliseconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500],
  registers: [register],
});

export function setupMetrics(server: FastifyInstance) {
  // Request timing
  server.addHook('onRequest', async (request) => {
    (request as any).startTime = Date.now();
  });

  server.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - ((request as any).startTime || Date.now());
    requestLatency.observe(
      {
        method: request.method,
        route: request.routeOptions?.url || request.url,
        status: reply.statusCode.toString(),
      },
      duration,
    );
  });

  // Metrics endpoint
  server.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
}
