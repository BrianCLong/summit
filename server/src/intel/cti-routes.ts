/**
 * CTI Routes - RBAC-Gated TAXII 2.1 and STIX Export API
 *
 * Provides REST endpoints for:
 * - TAXII 2.1 discovery and collections
 * - STIX bundle export
 * - Secure sharing with air-gap support
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import type { Driver } from 'neo4j-driver';
import {
  authenticateUser,
  requirePermission,
  requireAnyPermission,
  type AuthenticatedRequest,
} from '../conductor/auth/rbac-middleware.js';
import { TaxiiService, createTaxiiService } from './cti/taxii-service.js';
import { StixBundleFactory } from './cti/bundle-serializer.js';
import {
  StixSigningService,
  createSigningService,
  serializeAirGapPackage,
} from './cti/signing.js';
import { CTI_PERMISSIONS, type TlpLevel } from './cti/types.js';
import logger from '../config/logger.js';

const ctiLogger = logger.child({ module: 'cti-routes' });

// ============================================================================
// Request Schemas
// ============================================================================

const exportRequestSchema = z.object({
  entityIds: z.array(z.string().uuid()).min(1).max(1000),
  includeRelationships: z.boolean().optional().default(true),
  relationshipDepth: z.number().int().min(1).max(5).optional().default(1),
  tlpLevel: z.enum(['clear', 'white', 'green', 'amber', 'amber+strict', 'red']).optional().default('green'),
  includeExtensions: z.boolean().optional().default(true),
  investigationId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  producerName: z.string().max(255).optional(),
  labels: z.array(z.string().max(100)).optional(),
  sign: z.boolean().optional().default(false),
});

const syncRequestSchema = z.object({
  collectionId: z.string().optional().default('default'),
  entityKinds: z.array(z.string()).optional(),
  since: z.string().datetime().optional(),
});

const addObjectsRequestSchema = z.object({
  type: z.literal('bundle'),
  id: z.string(),
  objects: z.array(z.record(z.unknown())),
});

const queryOptionsSchema = z.object({
  added_after: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  next: z.string().optional(),
  'match[type]': z.string().optional(),
  'match[id]': z.string().optional(),
  'match[spec_version]': z.string().optional(),
});

// ============================================================================
// Route Factory
// ============================================================================

export interface CtiRouterDeps {
  pg: Pool;
  neo4j: Driver;
  signingKey?: string;
}

export function createCtiRouter(deps: CtiRouterDeps): Router {
  const router = Router();

  // Initialize services
  const taxiiService = createTaxiiService({}, deps);
  const bundleFactory = new StixBundleFactory(deps);
  const signingService = createSigningService(deps.signingKey);

  // Apply authentication to all routes
  router.use(authenticateUser);

  // ==========================================================================
  // TAXII 2.1 Discovery Endpoints
  // ==========================================================================

  /**
   * GET /taxii2/
   * TAXII Discovery Document
   */
  router.get('/taxii2/', (req, res) => {
    res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
    res.json(taxiiService.getDiscoveryDocument());
  });

  /**
   * GET /taxii2/api/
   * API Root Information
   */
  router.get('/taxii2/api/', (req, res) => {
    res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
    res.json(taxiiService.getApiRootInfo());
  });

  /**
   * GET /taxii2/api/collections
   * List Collections
   */
  router.get(
    '/taxii2/api/collections',
    requirePermission(CTI_PERMISSIONS.READ),
    (req, res) => {
      res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
      res.json({
        collections: taxiiService.listCollectionMetadata(),
      });
    },
  );

  /**
   * GET /taxii2/api/collections/:collectionId
   * Get Collection
   */
  router.get(
    '/taxii2/api/collections/:collectionId',
    requirePermission(CTI_PERMISSIONS.READ),
    (req, res) => {
      const collection = taxiiService.getCollectionMetadata(req.params.collectionId);
      if (!collection) {
        return res.status(404).json({
          title: 'Collection Not Found',
          http_status: '404',
          description: `Collection ${req.params.collectionId} not found`,
        });
      }

      res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
      res.json(collection);
    },
  );

  /**
   * GET /taxii2/api/collections/:collectionId/objects
   * Get Objects from Collection
   */
  router.get(
    '/taxii2/api/collections/:collectionId/objects',
    requirePermission(CTI_PERMISSIONS.READ),
    (req, res) => {
      try {
        const options = queryOptionsSchema.parse(req.query);
        const envelope = taxiiService.getObjects(req.params.collectionId, {
          addedAfter: options.added_after,
          limit: options.limit,
          next: options.next,
          type: options['match[type]']?.split(','),
          id: options['match[id]']?.split(',') as any,
        });

        res.setHeader('Content-Type', 'application/stix+json;version=2.1');
        if (envelope.next) {
          res.setHeader('X-TAXII-Date-Added-Last', envelope.next);
        }
        res.json(envelope);
      } catch (error) {
        handleError(res, error, 'Failed to retrieve objects');
      }
    },
  );

  /**
   * GET /taxii2/api/collections/:collectionId/manifest
   * Get Collection Manifest
   */
  router.get(
    '/taxii2/api/collections/:collectionId/manifest',
    requirePermission(CTI_PERMISSIONS.READ),
    (req, res) => {
      try {
        const options = queryOptionsSchema.parse(req.query);
        const manifest = taxiiService.getManifest(req.params.collectionId, {
          addedAfter: options.added_after,
          limit: options.limit,
          next: options.next,
        });

        res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
        res.json(manifest);
      } catch (error) {
        handleError(res, error, 'Failed to retrieve manifest');
      }
    },
  );

  /**
   * POST /taxii2/api/collections/:collectionId/objects
   * Add Objects to Collection
   */
  router.post(
    '/taxii2/api/collections/:collectionId/objects',
    requirePermission(CTI_PERMISSIONS.WRITE),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const bundle = addObjectsRequestSchema.parse(req.body);
        const status = taxiiService.addObjects(
          req.params.collectionId,
          bundle as any,
          authReq.user.userId,
        );

        res.status(202);
        res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
        res.json(status);

        ctiLogger.info({
          collectionId: req.params.collectionId,
          userId: authReq.user.userId,
          objectCount: bundle.objects.length,
          statusId: status.id,
        }, 'Objects added to TAXII collection');
      } catch (error) {
        handleError(res, error, 'Failed to add objects');
      }
    },
  );

  /**
   * GET /taxii2/api/collections/:collectionId/objects/:objectId
   * Get Object by ID
   */
  router.get(
    '/taxii2/api/collections/:collectionId/objects/:objectId',
    requirePermission(CTI_PERMISSIONS.READ),
    (req, res) => {
      const version = req.query.version as string | undefined;
      const envelope = taxiiService.getObject(
        req.params.collectionId,
        req.params.objectId as any,
        version,
      );

      if (!envelope || envelope.objects.length === 0) {
        return res.status(404).json({
          title: 'Object Not Found',
          http_status: '404',
          description: `Object ${req.params.objectId} not found in collection`,
        });
      }

      res.setHeader('Content-Type', 'application/stix+json;version=2.1');
      res.json(envelope);
    },
  );

  /**
   * DELETE /taxii2/api/collections/:collectionId/objects/:objectId
   * Delete Object by ID
   */
  router.delete(
    '/taxii2/api/collections/:collectionId/objects/:objectId',
    requirePermission(CTI_PERMISSIONS.ADMIN),
    (req: Request, res: Response) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const deleted = taxiiService.deleteObject(
          req.params.collectionId,
          req.params.objectId as any,
          authReq.user.userId,
        );

        if (!deleted) {
          return res.status(404).json({
            title: 'Object Not Found',
            http_status: '404',
            description: `Object ${req.params.objectId} not found`,
          });
        }

        res.status(204).send();
      } catch (error) {
        handleError(res, error, 'Failed to delete object');
      }
    },
  );

  /**
   * GET /taxii2/api/status/:statusId
   * Get Status of Add Operation
   */
  router.get(
    '/taxii2/api/status/:statusId',
    requirePermission(CTI_PERMISSIONS.READ),
    (req, res) => {
      const status = taxiiService.getStatus(req.params.statusId);

      if (!status) {
        return res.status(404).json({
          title: 'Status Not Found',
          http_status: '404',
          description: `Status ${req.params.statusId} not found`,
        });
      }

      res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
      res.json(status);
    },
  );

  // ==========================================================================
  // STIX Export Endpoints
  // ==========================================================================

  /**
   * POST /cti/export
   * Export entities to STIX bundle
   */
  router.post(
    '/cti/export',
    requirePermission(CTI_PERMISSIONS.EXPORT),
    async (req: Request, res: Response) => {
      const startTime = Date.now();

      try {
        const authReq = req as AuthenticatedRequest;
        const options = exportRequestSchema.parse(req.body);

        // Fetch entities
        const entities = await fetchEntities(deps.pg, authReq.user.tenantId || 'default', options.entityIds);

        if (entities.length === 0) {
          return res.status(404).json({
            error: 'No entities found',
            entityIds: options.entityIds,
          });
        }

        // Export to bundle
        const result = await bundleFactory.exportBundle(
          entities,
          {
            entityIds: options.entityIds,
            includeRelationships: options.includeRelationships,
            relationshipDepth: options.relationshipDepth,
            tlpLevel: options.tlpLevel as TlpLevel,
            includeExtensions: options.includeExtensions,
            investigationId: options.investigationId,
            caseId: options.caseId,
            producerName: options.producerName,
            labels: options.labels,
          },
          authReq.user.userId,
        );

        // Sign if requested and service available
        if (options.sign && signingService) {
          const signature = signingService.signBundle(result.bundle, {
            producerIdentity: authReq.user.userId,
          });
          result.metadata.signature = signature.signature;
          result.metadata.signatureAlgorithm = signature.metadata.algorithm;
        }

        const duration = Date.now() - startTime;
        ctiLogger.info({
          userId: authReq.user.userId,
          entityCount: entities.length,
          objectCount: result.bundle.objects.length,
          signed: options.sign && !!signingService,
          duration,
        }, 'STIX bundle exported');

        res.setHeader('Content-Type', 'application/stix+json;version=2.1');
        res.json(result);
      } catch (error) {
        handleError(res, error, 'Export failed');
      }
    },
  );

  /**
   * POST /cti/export/airgap
   * Export entities to air-gap package (signed bundle)
   */
  router.post(
    '/cti/export/airgap',
    requirePermission(CTI_PERMISSIONS.SHARE),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthenticatedRequest;

        if (!signingService) {
          return res.status(503).json({
            error: 'Air-gap export unavailable',
            message: 'Signing service not configured. Set STIX_SIGNING_KEY environment variable.',
          });
        }

        const options = exportRequestSchema.parse(req.body);

        // Fetch entities
        const entities = await fetchEntities(deps.pg, authReq.user.tenantId || 'default', options.entityIds);

        if (entities.length === 0) {
          return res.status(404).json({
            error: 'No entities found',
            entityIds: options.entityIds,
          });
        }

        // Export to bundle
        const result = await bundleFactory.exportBundle(
          entities,
          {
            entityIds: options.entityIds,
            includeRelationships: options.includeRelationships,
            relationshipDepth: options.relationshipDepth,
            tlpLevel: options.tlpLevel as TlpLevel,
            includeExtensions: options.includeExtensions,
            investigationId: options.investigationId,
            caseId: options.caseId,
            producerName: options.producerName,
            labels: options.labels,
          },
          authReq.user.userId,
        );

        // Create air-gap package
        const airGapPackage = signingService.createAirGapPackage([result.bundle]);
        const serialized = serializeAirGapPackage(airGapPackage);

        ctiLogger.info({
          userId: authReq.user.userId,
          entityCount: entities.length,
          bundleCount: 1,
        }, 'Air-gap package created');

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="intelgraph-airgap-${Date.now()}.json"`);
        res.send(serialized);
      } catch (error) {
        handleError(res, error, 'Air-gap export failed');
      }
    },
  );

  /**
   * POST /cti/verify
   * Verify a signed bundle or air-gap package
   */
  router.post(
    '/cti/verify',
    requirePermission(CTI_PERMISSIONS.READ),
    async (req: Request, res: Response) => {
      try {
        if (!signingService) {
          return res.status(503).json({
            error: 'Verification unavailable',
            message: 'Signing service not configured',
          });
        }

        const body = req.body;

        // Check if it's an air-gap package
        if (body.version && body.format === 'stix-bundle-signed') {
          const result = signingService.verifyAirGapPackage(body);
          return res.json({
            type: 'airgap-package',
            ...result,
          });
        }

        // Check if it's a signed bundle
        if (body.bundle && body.signature) {
          const result = signingService.verifySignedBundle(body);
          return res.json({
            type: 'signed-bundle',
            ...result,
          });
        }

        return res.status(400).json({
          error: 'Invalid input',
          message: 'Expected air-gap package or signed bundle',
        });
      } catch (error) {
        handleError(res, error, 'Verification failed');
      }
    },
  );

  /**
   * POST /cti/sync
   * Sync entities from IntelGraph to TAXII collection
   */
  router.post(
    '/cti/sync',
    requirePermission(CTI_PERMISSIONS.ADMIN),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const options = syncRequestSchema.parse(req.body);

        const status = await taxiiService.syncFromIntelGraph(
          options.collectionId,
          {
            tenantId: authReq.user.tenantId || 'default',
            entityKinds: options.entityKinds,
            since: options.since ? new Date(options.since) : undefined,
            userId: authReq.user.userId,
          },
        );

        ctiLogger.info({
          collectionId: options.collectionId,
          userId: authReq.user.userId,
          successCount: status.success_count,
        }, 'Collection sync completed');

        res.json(status);
      } catch (error) {
        handleError(res, error, 'Sync failed');
      }
    },
  );

  // ==========================================================================
  // Health & Info Endpoints
  // ==========================================================================

  /**
   * GET /cti/health
   * CTI Service Health Check
   */
  router.get('/cti/health', (req, res) => {
    res.json({
      status: 'healthy',
      services: {
        taxii: true,
        signing: !!signingService,
        database: true,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /cti/info
   * CTI Service Information
   */
  router.get('/cti/info', (req, res) => {
    res.json({
      name: 'IntelGraph CTI Service',
      version: '1.0.0',
      stixVersion: '2.1',
      taxiiVersion: '2.1',
      capabilities: {
        export: true,
        import: true,
        signing: !!signingService,
        airgap: !!signingService,
        collections: taxiiService.listCollections().length,
      },
      endpoints: {
        taxii: '/taxii2/',
        export: '/cti/export',
        airgap: '/cti/export/airgap',
        verify: '/cti/verify',
        sync: '/cti/sync',
      },
    });
  });

  return router;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchEntities(
  pg: Pool,
  tenantId: string,
  entityIds: string[],
): Promise<any[]> {
  if (entityIds.length === 0) return [];

  const result = await pg.query(
    'SELECT * FROM entities WHERE tenant_id = $1 AND id = ANY($2)',
    [tenantId, entityIds],
  );

  return result.rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind,
    labels: row.labels,
    props: row.props,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  }));
}

function handleError(res: Response, error: unknown, message: string): void {
  ctiLogger.error({ error }, message);

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    }) as any;
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      }) as any;
    }

    if (error.message.includes('permission') || error.message.includes('allow')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
      }) as any;
    }
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message,
  });
}

// ============================================================================
// Default Export
// ============================================================================

export default createCtiRouter;
