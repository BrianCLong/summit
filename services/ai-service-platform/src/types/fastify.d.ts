import 'fastify';
import type { ServiceRegistry } from '../core/service-registry.js';
import type { DeploymentOrchestrator } from '../core/deployment-orchestrator.js';
import type { ComplianceEngine } from '../compliance/compliance-engine.js';
import type { AnalyticsCollector } from '../analytics/analytics-collector.js';
import type { TemplateLibrary } from '../templates/template-library.js';

declare module 'fastify' {
  interface FastifyInstance {
    serviceRegistry: ServiceRegistry;
    deploymentOrchestrator: DeploymentOrchestrator;
    complianceEngine: ComplianceEngine;
    analyticsCollector: AnalyticsCollector;
    templateLibrary: TemplateLibrary;
  }
}
