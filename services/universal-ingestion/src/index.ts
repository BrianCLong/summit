/**
 * Universal Ingestion Service
 *
 * Provides HTTP API for data ingestion with ETL and license-aware policy enforcement.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';
import axios from 'axios';

import { ETLAssistant } from '@intelgraph/etl-assistant';
import type {
  SampleRecord,
  CanonicalEntityType,
  RedactionStrategy,
} from '@intelgraph/etl-assistant';

import { IngestEventBus, InMemoryEventBus } from './event-bus';

const PORT = parseInt(process.env.PORT || '4040');
const NODE_ENV = process.env.NODE_ENV || 'development';
const LICENSE_REGISTRY_URL =
  process.env.LICENSE_REGISTRY_URL || 'http://localhost:4030';

// Schemas
const SampleRequestSchema = z.object({
  samples: z.array(z.record(z.string(), z.any())),
  licenseId: z.string(),
  schemaHint: z.string().optional(),
});

const RegisterSourceRequestSchema = z.object({
  connectorType: z.enum(['csv-file', 'rest-pull', 's3-bucket']),
  connectorConfig: z.record(z.string(), z.any()),
  licenseId: z.string(),
  entityType: z.string().optional(),
  fieldMappings: z
    .array(
      z.object({
        sourceField: z.string(),
        targetField: z.string(),
        transformation: z.string().optional(),
      })
    )
    .optional(),
  redactionRules: z.record(z.string(), z.enum(['MASK', 'DROP', 'HASH'])).optional(),
});

const ExportCheckRequestSchema = z.object({
  licenseId: z.string(),
  operation: z.enum(['INGEST', 'EXPORT', 'SHARE', 'TRANSFORM']),
  audience: z.string().optional(),
  jurisdiction: z.string().optional(),
  purpose: z.string().optional(),
});

type SampleRequest = z.infer<typeof SampleRequestSchema>;
type RegisterSourceRequest = z.infer<typeof RegisterSourceRequestSchema>;
type ExportCheckRequest = z.infer<typeof ExportCheckRequestSchema>;

/**
 * In-memory registry for registered sources
 * In production, this would be backed by a database
 */
interface RegisteredSource {
  id: string;
  connectorType: string;
  connectorConfig: Record<string, unknown>;
  licenseId: string;
  entityType: CanonicalEntityType;
  fieldMappings: any[];
  redactionRules?: Record<string, RedactionStrategy>;
  registeredAt: string;
}

const registeredSources = new Map<string, RegisteredSource>();

// Create Fastify instance
const server: FastifyInstance = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
});

// Register plugins
server.register(helmet);
server.register(cors);

// Initialize ETL Assistant and Event Bus
const etlAssistant = new ETLAssistant();
const eventBus: IngestEventBus = new InMemoryEventBus();

// Health check
server.get('/health', async () => {
  try {
    // Check license registry connectivity
    const licenseHealthResponse = await axios.get(
      `${LICENSE_REGISTRY_URL}/health`,
      { timeout: 2000 }
    );

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        licenseRegistry: licenseHealthResponse.data.status,
        eventBus: 'healthy',
      },
    };
  } catch (error) {
    return {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        licenseRegistry: 'unhealthy',
        eventBus: 'healthy',
      },
    };
  }
});

/**
 * POST /ingest/sources/:sourceId/sample
 *
 * Analyze sample records and return schema inference + PII detection results
 */
server.post<{
  Params: { sourceId: string };
  Body: SampleRequest;
}>('/ingest/sources/:sourceId/sample', async (request, reply) => {
  try {
    const { sourceId } = request.params;
    const { samples, licenseId, schemaHint } = SampleRequestSchema.parse(
      request.body
    );

    server.log.info('Analyzing sample records', {
      sourceId,
      sampleCount: samples.length,
      licenseId,
    });

    // Perform schema inference
    const schemaInference = etlAssistant.getSchemaInference();
    const schemaResult = schemaInference.inferSchema(samples, schemaHint);

    // Perform PII detection
    const piiDetection = etlAssistant.getPIIDetection();
    const piiResult = piiDetection.detectPII(samples);

    return {
      sourceId,
      schema: {
        entityType: schemaResult.entityType,
        confidence: schemaResult.confidence,
        fieldMappings: schemaResult.fieldMappings,
        reasoning: schemaResult.reasoning,
      },
      pii: {
        piiFields: piiResult.piiFields,
        riskLevel: piiResult.riskLevel,
        recommendations: piiResult.recommendations,
        summary: piiResult.summary,
      },
      statistics: schemaResult.statistics,
      licenseId,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    server.log.error(error, 'Sample analysis failed');
    reply.status(500);
    return { error: 'Sample analysis failed', message: (error as Error).message };
  }
});

/**
 * POST /ingest/sources/:sourceId/register
 *
 * Register a data source with connector config and mappings
 */
server.post<{
  Params: { sourceId: string };
  Body: RegisterSourceRequest;
}>('/ingest/sources/:sourceId/register', async (request, reply) => {
  try {
    const { sourceId } = request.params;
    const {
      connectorType,
      connectorConfig,
      licenseId,
      entityType,
      fieldMappings,
      redactionRules,
    } = RegisterSourceRequestSchema.parse(request.body);

    server.log.info('Registering data source', {
      sourceId,
      connectorType,
      licenseId,
    });

    // Validate license via policy check
    const policyResponse = await axios.post(
      `${LICENSE_REGISTRY_URL}/compliance/check`,
      {
        operation: 'ingest',
        data_source_ids: [sourceId],
        purpose: 'data_ingestion',
      },
      {
        headers: {
          'x-authority-id': 'universal-ingestion-service',
          'x-reason-for-access': 'Data source registration',
        },
      }
    );

    const complianceStatus = policyResponse.data.compliance_status;
    const violations = policyResponse.data.violations || [];
    const warnings = policyResponse.data.warnings || [];

    if (complianceStatus === 'block') {
      reply.status(403);
      return {
        error: 'Registration blocked by policy',
        violations,
        appealPath: policyResponse.data.appeal_path,
      };
    }

    // Register source
    const registeredSource: RegisteredSource = {
      id: sourceId,
      connectorType,
      connectorConfig,
      licenseId,
      entityType: (entityType || 'Document') as CanonicalEntityType,
      fieldMappings: fieldMappings || [],
      redactionRules,
      registeredAt: new Date().toISOString(),
    };

    registeredSources.set(sourceId, registeredSource);

    server.log.info('Data source registered successfully', { sourceId });

    return {
      sourceId,
      status: 'registered',
      complianceStatus,
      warnings,
      registeredAt: registeredSource.registeredAt,
    };
  } catch (error) {
    server.log.error(error, 'Source registration failed');
    reply.status(500);
    return {
      error: 'Source registration failed',
      message: (error as Error).message,
    };
  }
});

/**
 * POST /exports/check
 *
 * Check if an export operation is allowed under license policy
 */
server.post<{ Body: ExportCheckRequest }>(
  '/exports/check',
  async (request, reply) => {
    try {
      const { licenseId, operation, audience, jurisdiction, purpose } =
        ExportCheckRequestSchema.parse(request.body);

      server.log.info('Checking export policy', {
        licenseId,
        operation,
        audience,
        jurisdiction,
      });

      // Call license registry policy engine
      const policyResponse = await axios.post(
        `${LICENSE_REGISTRY_URL}/compliance/check`,
        {
          operation,
          data_source_ids: [licenseId], // Using licenseId as data source for this check
          purpose,
          jurisdiction,
        },
        {
          headers: {
            'x-authority-id': 'universal-ingestion-service',
            'x-reason-for-access': `Policy check for ${operation}`,
          },
        }
      );

      const complianceStatus = policyResponse.data.compliance_status;
      const violations = policyResponse.data.violations || [];
      const warnings = policyResponse.data.warnings || [];

      return {
        allow: complianceStatus === 'allow',
        reason: policyResponse.data.human_readable_reason,
        licenseId,
        operation,
        complianceStatus,
        violations,
        warnings,
        context: {
          audience,
          jurisdiction,
          purpose,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      server.log.error(error, 'Export check failed');
      reply.status(500);
      return {
        error: 'Export check failed',
        message: (error as Error).message,
      };
    }
  }
);

/**
 * GET /ingest/sources/:sourceId
 *
 * Get registered source details
 */
server.get<{ Params: { sourceId: string } }>(
  '/ingest/sources/:sourceId',
  async (request, reply) => {
    const { sourceId } = request.params;

    const source = registeredSources.get(sourceId);

    if (!source) {
      reply.status(404);
      return { error: 'Source not found' };
    }

    return source;
  }
);

/**
 * GET /ingest/sources
 *
 * List all registered sources
 */
server.get('/ingest/sources', async () => {
  return {
    sources: Array.from(registeredSources.values()),
    count: registeredSources.size,
  };
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`📥 Universal Ingestion Service ready at http://localhost:${PORT}`);
    server.log.info(`   License Registry: ${LICENSE_REGISTRY_URL}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  server.log.info('SIGTERM received, shutting down gracefully');
  await eventBus.close();
  await server.close();
  process.exit(0);
});

start();

export { server, etlAssistant, eventBus };
