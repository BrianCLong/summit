/**
 * Health Check API Schemas and Routes
 * Demonstrates OpenAPI + Zod validation pattern
 */

import { z } from 'zod';
import { registry, HealthResponseSchema } from '../spec.js';

// Register health endpoints
registry.registerPath({
  method: 'get',
  path: '/health',
  description: 'Basic health check endpoint',
  summary: 'Check service health',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health/detailed',
  description: 'Detailed health check with dependency status',
  summary: 'Check detailed service health',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
    },
    503: {
      description: 'Service is degraded or unhealthy',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health/ready',
  description: 'Kubernetes readiness probe',
  summary: 'Check if service is ready to accept traffic',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is ready',
      content: {
        'application/json': {
          schema: z.object({ status: z.literal('ready') }),
        },
      },
    },
    503: {
      description: 'Service is not ready',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('not ready'),
            error: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health/live',
  description: 'Kubernetes liveness probe',
  summary: 'Check if service is alive',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is alive',
      content: {
        'application/json': {
          schema: z.object({ status: z.literal('alive') }),
        },
      },
    },
  },
});
