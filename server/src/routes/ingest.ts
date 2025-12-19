/**
 * HTTP Ingest Endpoint
 * Provides REST API for data ingestion with JWT auth and validation
 */

import { Router, Request, Response } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { IngestService } from '../services/IngestService.js';
import { verifyTenantAccess } from '../services/opa-client.js';
import logger from '../config/logger.js';
import { recordEndpointResult } from '../observability/reliability-metrics';

const ingestRouter = Router();
const ingestLogger = logger.child({ name: 'IngestAPI' });
const tracer = trace.getTracer('intelgraph-server.reliability');
let ingestInFlight = 0;

// Rate limiting: max 100 requests per 15 minutes per IP
const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many ingest requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/v1/ingest
 * Ingest entities and relationships via HTTP
 */
ingestRouter.post(
  '/api/v1/ingest',
  ingestLimiter,
  [
    body('tenantId').isString().notEmpty(),
    body('sourceType').isString().notEmpty(),
    body('sourceId').isString().notEmpty(),
    body('entities').isArray().notEmpty(),
    body('entities.*.kind').isString().notEmpty(),
    body('entities.*.labels').isArray(),
    body('entities.*.properties').isObject(),
    body('relationships').isArray().optional(),
  ],
  async (req: Request, res: Response) => {
    const startTime = process.hrtime.bigint();
    const span = tracer.startSpan('http.ingest', {
      attributes: {
        'http.method': 'POST',
        'http.route': '/api/v1/ingest',
      },
    });
    ingestInFlight += 1;

    let statusCode = 500;
    let tenantId: string | undefined = req.body?.tenantId;
    let entityCount = Array.isArray(req.body?.entities) ? req.body.entities.length : 0;
    let relationshipCount = Array.isArray(req.body?.relationships)
      ? req.body.relationships.length
      : 0;

    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        statusCode = 400;
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { tenantId: validatedTenantId, sourceType, sourceId, entities, relationships = [] } =
        req.body;

      tenantId = validatedTenantId;
      entityCount = entities.length;
      relationshipCount = relationships.length;

      // Authenticate user (from JWT middleware)
      const user = (req as any).user;
      if (!user) {
        statusCode = 401;
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid JWT token required',
        });
      }

      // Authorize tenant access
      try {
        await verifyTenantAccess(user, validatedTenantId, 'ingest:write');
      } catch (authError: any) {
        statusCode = 403;
        return res.status(403).json({
          error: 'Forbidden',
          message: authError.message,
        });
      }

      // Validate entity count limits
      const MAX_ENTITIES_PER_REQUEST = 10000;
      if (entities.length > MAX_ENTITIES_PER_REQUEST) {
        statusCode = 413;
        return res.status(413).json({
          error: 'Payload too large',
          message: `Maximum ${MAX_ENTITIES_PER_REQUEST} entities per request`,
          received: entities.length,
        });
      }

      ingestLogger.info({
        tenantId: validatedTenantId,
        userId: user.id,
        sourceType,
        entitiesCount: entities.length,
        relationshipsCount: relationships.length,
      }, 'Processing ingest request');

      // Perform ingest
      const ingestService = new IngestService(
        (req.app.get('pg') as any),
        (req.app.get('neo4j') as any),
      );

      const result = await ingestService.ingest({
        tenantId: validatedTenantId,
        sourceType,
        sourceId,
        entities,
        relationships,
        userId: user.id,
      });

      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      statusCode = result.success ? 200 : 207;

      ingestLogger.info({
        tenantId: validatedTenantId,
        userId: user.id,
        provenanceId: result.provenanceId,
        entitiesCreated: result.entitiesCreated,
        entitiesUpdated: result.entitiesUpdated,
        duration: durationMs,
      }, 'Ingest completed');

      // Return success response
      res.status(statusCode).json({
        success: result.success,
        provenanceId: result.provenanceId,
        summary: {
          entitiesCreated: result.entitiesCreated,
          entitiesUpdated: result.entitiesUpdated,
          relationshipsCreated: result.relationshipsCreated,
          relationshipsUpdated: result.relationshipsUpdated,
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
        metadata: {
          duration: durationMs,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      ingestLogger.error({
        error: error.message,
        stack: error.stack,
        body: req.body,
      }, 'Ingest request failed');

      statusCode = 500;
      res.status(statusCode).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production'
          ? 'Ingest failed'
          : error.message,
      });
    }
    finally {
      ingestInFlight = Math.max(ingestInFlight - 1, 0);
      const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;
      recordEndpointResult({
        endpoint: 'ingest',
        statusCode,
        durationSeconds,
        tenantId,
        queueDepth: ingestInFlight,
      });

      span.setAttributes({
        'http.status_code': statusCode,
        'tenant.id': tenantId ?? 'unknown',
        'ingest.entity_count': entityCount,
        'ingest.relationship_count': relationshipCount,
        'ingest.in_flight': ingestInFlight,
      });

      if (statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }

      span.end();
    }
  },
);

/**
 * GET /api/v1/ingest/status/:provenanceId
 * Get status of an ingest job
 */
ingestRouter.get(
  '/api/v1/ingest/status/:provenanceId',
  async (req: Request, res: Response) => {
    try {
      const { provenanceId } = req.params;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Query provenance record
      const pg = req.app.get('pg') as any;
      const { rows } = await pg.query(
        `SELECT * FROM provenance_records WHERE id = $1`,
        [provenanceId],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Provenance record not found',
        });
      }

      const record = rows[0];

      // Check tenant access
      try {
        await verifyTenantAccess(user, record.tenant_id, 'entity:read');
      } catch {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({
        provenanceId: record.id,
        tenantId: record.tenant_id,
        sourceType: record.source_type,
        sourceId: record.source_id,
        entityCount: record.entity_count,
        relationshipCount: record.relationship_count,
        createdAt: record.created_at,
        hashManifest: record.hash_manifest,
      });
    } catch (error: any) {
      ingestLogger.error({ error }, 'Failed to fetch ingest status');
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export { ingestRouter };
