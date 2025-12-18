/**
 * HTTP Ingest Endpoint
 * Provides REST API for data ingestion with JWT auth and validation
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { IngestService } from '../services/IngestService.js';
import { verifyTenantAccess } from '../services/opa-client.js';
import logger from '../config/logger.js';

const ingestRouter = Router();
const ingestLogger = logger.child({ name: 'IngestAPI' });

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
    const startTime = Date.now();

    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { tenantId, sourceType, sourceId, entities, relationships = [] } = req.body;

      // Authenticate user (from JWT middleware)
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid JWT token required',
        });
      }

      // Authorize tenant access
      try {
        await verifyTenantAccess(user, tenantId, 'ingest:write');
      } catch (authError: any) {
        return res.status(403).json({
          error: 'Forbidden',
          message: authError.message,
        });
      }

      // Validate entity count limits
      const MAX_ENTITIES_PER_REQUEST = 10000;
      if (entities.length > MAX_ENTITIES_PER_REQUEST) {
        return res.status(413).json({
          error: 'Payload too large',
          message: `Maximum ${MAX_ENTITIES_PER_REQUEST} entities per request`,
          received: entities.length,
        });
      }

      ingestLogger.info({
        tenantId,
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
        tenantId,
        sourceType,
        sourceId,
        entities,
        relationships,
        userId: user.id,
      });

      const duration = Date.now() - startTime;

      ingestLogger.info({
        tenantId,
        userId: user.id,
        provenanceId: result.provenanceId,
        entitiesCreated: result.entitiesCreated,
        entitiesUpdated: result.entitiesUpdated,
        duration,
      }, 'Ingest completed');

      // Return success response
      res.status(result.success ? 200 : 207).json({
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
          duration,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      ingestLogger.error({
        error: error.message,
        stack: error.stack,
        body: req.body,
      }, 'Ingest request failed');

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production'
          ? 'Ingest failed'
          : error.message,
      });
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
