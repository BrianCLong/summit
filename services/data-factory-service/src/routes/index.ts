/**
 * Data Factory Service - Routes Index
 *
 * Registers all API routes with the Fastify application.
 */

import { FastifyInstance } from 'fastify';
import { ServiceContainer } from '../services/index.js';
import { registerDatasetRoutes } from './datasets.js';
import { registerSampleRoutes } from './samples.js';
import { registerLabelingRoutes } from './labeling.js';
import { registerWorkflowRoutes } from './workflows.js';
import { registerExportRoutes } from './exports.js';
import { registerAnnotatorRoutes } from './annotators.js';
import { registerQualityRoutes } from './quality.js';

export function registerRoutes(
  app: FastifyInstance,
  services: ServiceContainer
): void {
  // Register all route modules
  registerDatasetRoutes(app, services);
  registerSampleRoutes(app, services);
  registerLabelingRoutes(app, services);
  registerWorkflowRoutes(app, services);
  registerExportRoutes(app, services);
  registerAnnotatorRoutes(app, services);
  registerQualityRoutes(app, services);
}

export {
  registerDatasetRoutes,
  registerSampleRoutes,
  registerLabelingRoutes,
  registerWorkflowRoutes,
  registerExportRoutes,
  registerAnnotatorRoutes,
  registerQualityRoutes,
};
