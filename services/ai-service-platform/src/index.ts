/**
 * AI Service Deployment Platform
 *
 * Instant rollout platform for AI services with built-in compliance
 * and performance analytics. Deploy in hours, not months.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ServiceRegistry } from './core/service-registry.js';
import { DeploymentOrchestrator } from './core/deployment-orchestrator.js';
import { ComplianceEngine } from './compliance/compliance-engine.js';
import { AnalyticsCollector } from './analytics/analytics-collector.js';
import { TemplateLibrary } from './templates/template-library.js';
import { healthRoutes } from './routes/health.js';
import { serviceRoutes } from './routes/services.js';
import { deploymentRoutes } from './routes/deployments.js';
import { analyticsRoutes } from './routes/analytics.js';
import { templateRoutes } from './routes/templates.js';
import { setupMetrics } from './metrics/prometheus.js';
import { config } from './config.js';

const server = Fastify({
  logger: {
    level: config.logLevel,
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
  },
});

// Core platform components
const serviceRegistry = new ServiceRegistry();
const complianceEngine = new ComplianceEngine();
const analyticsCollector = new AnalyticsCollector();
const templateLibrary = new TemplateLibrary();
const deploymentOrchestrator = new DeploymentOrchestrator(
  serviceRegistry,
  complianceEngine,
  analyticsCollector,
);

async function start() {
  // Security middleware
  await server.register(cors, { origin: config.corsOrigins });
  await server.register(helmet);

  // Decorate with platform components
  server.decorate('serviceRegistry', serviceRegistry);
  server.decorate('deploymentOrchestrator', deploymentOrchestrator);
  server.decorate('complianceEngine', complianceEngine);
  server.decorate('analyticsCollector', analyticsCollector);
  server.decorate('templateLibrary', templateLibrary);

  // Register routes
  await server.register(healthRoutes);
  await server.register(serviceRoutes, { prefix: '/api/v1/services' });
  await server.register(deploymentRoutes, { prefix: '/api/v1/deployments' });
  await server.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  await server.register(templateRoutes, { prefix: '/api/v1/templates' });

  // Prometheus metrics
  setupMetrics(server);

  // Initialize components
  await serviceRegistry.initialize();
  await complianceEngine.initialize();
  await analyticsCollector.initialize();
  await templateLibrary.loadBuiltInTemplates();

  await server.listen({ port: config.port, host: '0.0.0.0' });
  server.log.info(
    `AI Service Platform running on http://0.0.0.0:${config.port}`,
  );
  server.log.info('Ready to deploy AI services in hours, not months!');
}

start().catch((err) => {
  console.error('Failed to start AI Service Platform:', err);
  process.exit(1);
});

export { server };
