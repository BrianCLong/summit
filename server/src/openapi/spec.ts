/**
 * OpenAPI 3.0 Specification Generator
 * Generates comprehensive API documentation with Zod schema validation
 */

import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

// Create OpenAPI registry
export const registry = new OpenAPIRegistry();

// Common response schemas
export const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z
    .object({
      error: z.string().describe('Error message'),
      code: z.string().optional().describe('Error code'),
      details: z.any().optional().describe('Additional error details'),
    })
    .openapi({ description: 'Error response object' }),
);

export const HealthResponseSchema = registry.register(
  'HealthResponse',
  z
    .object({
      status: z.enum(['ok', 'degraded', 'unhealthy']),
      timestamp: z.string().datetime(),
      uptime: z.number(),
      environment: z.string(),
      services: z
        .object({
          neo4j: z.enum(['healthy', 'unhealthy', 'unknown']).optional(),
          postgres: z.enum(['healthy', 'unhealthy', 'unknown']).optional(),
          redis: z.enum(['healthy', 'unhealthy', 'unknown']).optional(),
        })
        .optional(),
      memory: z
        .object({
          used: z.number(),
          total: z.number(),
          unit: z.string(),
        })
        .optional(),
    })
    .openapi({ description: 'Health check response' }),
);

// Pagination schemas
export const PaginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).describe('Page number'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe('Items per page'),
  })
  .openapi({ description: 'Pagination parameters' });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// Generate base OpenAPI document
export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: process.env.npm_package_version || '1.0.0',
      title: 'IntelGraph Platform API',
      description:
        'Comprehensive API documentation for IntelGraph intelligence analysis platform with graph analytics, AI-powered insights, and collaborative investigation tools.',
      contact: {
        name: 'IntelGraph Team',
        email: 'api@intelgraph.io',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://api.intelgraph.io',
        description: 'Production server',
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication',
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and monitoring endpoints',
      },
      {
        name: 'AI',
        description: 'AI-powered analysis and insights',
      },
      {
        name: 'Cases',
        description: 'Investigation case management',
      },
      {
        name: 'Evidence',
        description: 'Evidence collection and analysis',
      },
      {
        name: 'Entities',
        description: 'Entity management and relationships',
      },
      {
        name: 'Admin',
        description: 'Administrative operations',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting',
      },
    ],
  });
}
