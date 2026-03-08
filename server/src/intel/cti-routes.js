"use strict";
// @ts-nocheck
/**
 * CTI Routes - RBAC-Gated TAXII 2.1 and STIX Export API
 *
 * Provides REST endpoints for:
 * - TAXII 2.1 discovery and collections
 * - STIX bundle export
 * - Secure sharing with air-gap support
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCtiRouter = createCtiRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const rbac_middleware_js_1 = require("../conductor/auth/rbac-middleware.js");
const taxii_service_js_1 = require("./cti/taxii-service.js");
const bundle_serializer_js_1 = require("./cti/bundle-serializer.js");
const signing_js_1 = require("./cti/signing.js");
const types_js_1 = require("./cti/types.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const ctiLogger = logger_js_1.default.child({ module: 'cti-routes' });
// ============================================================================
// Request Schemas
// ============================================================================
const exportRequestSchema = zod_1.z.object({
    entityIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(1000),
    includeRelationships: zod_1.z.boolean().optional().default(true),
    relationshipDepth: zod_1.z.number().int().min(1).max(5).optional().default(1),
    tlpLevel: zod_1.z.enum(['clear', 'white', 'green', 'amber', 'amber+strict', 'red']).optional().default('green'),
    includeExtensions: zod_1.z.boolean().optional().default(true),
    investigationId: zod_1.z.string().uuid().optional(),
    caseId: zod_1.z.string().uuid().optional(),
    producerName: zod_1.z.string().max(255).optional(),
    labels: zod_1.z.array(zod_1.z.string().max(100)).optional(),
    sign: zod_1.z.boolean().optional().default(false),
});
const syncRequestSchema = zod_1.z.object({
    collectionId: zod_1.z.string().optional().default('default'),
    entityKinds: zod_1.z.array(zod_1.z.string()).optional(),
    since: zod_1.z.string().datetime().optional(),
});
const addObjectsRequestSchema = zod_1.z.object({
    type: zod_1.z.literal('bundle'),
    id: zod_1.z.string(),
    objects: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())),
});
const queryOptionsSchema = zod_1.z.object({
    added_after: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(1000).optional(),
    next: zod_1.z.string().optional(),
    'match[type]': zod_1.z.string().optional(),
    'match[id]': zod_1.z.string().optional(),
    'match[spec_version]': zod_1.z.string().optional(),
});
function createCtiRouter(deps) {
    const router = (0, express_1.Router)();
    // Initialize services
    const taxiiService = (0, taxii_service_js_1.createTaxiiService)({}, deps);
    const bundleFactory = new bundle_serializer_js_1.StixBundleFactory(deps);
    const signingService = (0, signing_js_1.createSigningService)(deps.signingKey);
    // Apply authentication to all routes
    router.use(rbac_middleware_js_1.authenticateUser);
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
    router.get('/taxii2/api/collections', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.READ), (req, res) => {
        res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
        res.json({
            collections: taxiiService.listCollectionMetadata(),
        });
    });
    /**
     * GET /taxii2/api/collections/:collectionId
     * Get Collection
     */
    router.get('/taxii2/api/collections/:collectionId', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.READ), (req, res) => {
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
    });
    /**
     * GET /taxii2/api/collections/:collectionId/objects
     * Get Objects from Collection
     */
    router.get('/taxii2/api/collections/:collectionId/objects', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.READ), (req, res) => {
        try {
            const options = queryOptionsSchema.parse(req.query);
            const envelope = taxiiService.getObjects(req.params.collectionId, {
                addedAfter: options.added_after,
                limit: options.limit,
                next: options.next,
                type: options['match[type]']?.split(','),
                id: options['match[id]']?.split(','),
            });
            res.setHeader('Content-Type', 'application/stix+json;version=2.1');
            if (envelope.next) {
                res.setHeader('X-TAXII-Date-Added-Last', envelope.next);
            }
            res.json(envelope);
        }
        catch (error) {
            handleError(res, error, 'Failed to retrieve objects');
        }
    });
    /**
     * GET /taxii2/api/collections/:collectionId/manifest
     * Get Collection Manifest
     */
    router.get('/taxii2/api/collections/:collectionId/manifest', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.READ), (req, res) => {
        try {
            const options = queryOptionsSchema.parse(req.query);
            const manifest = taxiiService.getManifest(req.params.collectionId, {
                addedAfter: options.added_after,
                limit: options.limit,
                next: options.next,
            });
            res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
            res.json(manifest);
        }
        catch (error) {
            handleError(res, error, 'Failed to retrieve manifest');
        }
    });
    /**
     * POST /taxii2/api/collections/:collectionId/objects
     * Add Objects to Collection
     */
    router.post('/taxii2/api/collections/:collectionId/objects', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.WRITE), async (req, res) => {
        try {
            const authReq = req;
            const bundle = addObjectsRequestSchema.parse(req.body);
            const status = taxiiService.addObjects(req.params.collectionId, bundle, authReq.user.userId);
            res.status(202);
            res.setHeader('Content-Type', 'application/taxii+json;version=2.1');
            res.json(status);
            ctiLogger.info({
                collectionId: req.params.collectionId,
                userId: authReq.user.userId,
                objectCount: bundle.objects.length,
                statusId: status.id,
            }, 'Objects added to TAXII collection');
        }
        catch (error) {
            handleError(res, error, 'Failed to add objects');
        }
    });
    /**
     * GET /taxii2/api/collections/:collectionId/objects/:objectId
     * Get Object by ID
     */
    router.get('/taxii2/api/collections/:collectionId/objects/:objectId', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.READ), (req, res) => {
        const version = req.query.version;
        const envelope = taxiiService.getObject(req.params.collectionId, req.params.objectId, version);
        if (!envelope || envelope.objects.length === 0) {
            return res.status(404).json({
                title: 'Object Not Found',
                http_status: '404',
                description: `Object ${req.params.objectId} not found in collection`,
            });
        }
        res.setHeader('Content-Type', 'application/stix+json;version=2.1');
        res.json(envelope);
    });
    /**
     * DELETE /taxii2/api/collections/:collectionId/objects/:objectId
     * Delete Object by ID
     */
    router.delete('/taxii2/api/collections/:collectionId/objects/:objectId', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.ADMIN), (req, res) => {
        try {
            const authReq = req;
            const deleted = taxiiService.deleteObject(req.params.collectionId, req.params.objectId, authReq.user.userId);
            if (!deleted) {
                return res.status(404).json({
                    title: 'Object Not Found',
                    http_status: '404',
                    description: `Object ${req.params.objectId} not found`,
                });
            }
            res.status(204).send();
        }
        catch (error) {
            handleError(res, error, 'Failed to delete object');
        }
    });
    /**
     * GET /taxii2/api/status/:statusId
     * Get Status of Add Operation
     */
    router.get('/taxii2/api/status/:statusId', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.READ), (req, res) => {
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
    });
    // ==========================================================================
    // STIX Export Endpoints
    // ==========================================================================
    /**
     * POST /cti/export
     * Export entities to STIX bundle
     */
    router.post('/cti/export', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.EXPORT), async (req, res) => {
        const startTime = Date.now();
        try {
            const authReq = req;
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
            const result = await bundleFactory.exportBundle(entities, {
                entityIds: options.entityIds,
                includeRelationships: options.includeRelationships,
                relationshipDepth: options.relationshipDepth,
                tlpLevel: options.tlpLevel,
                includeExtensions: options.includeExtensions,
                investigationId: options.investigationId,
                caseId: options.caseId,
                producerName: options.producerName,
                labels: options.labels,
            }, authReq.user.userId);
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
        }
        catch (error) {
            handleError(res, error, 'Export failed');
        }
    });
    /**
     * POST /cti/export/airgap
     * Export entities to air-gap package (signed bundle)
     */
    router.post('/cti/export/airgap', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.SHARE), async (req, res) => {
        try {
            const authReq = req;
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
            const result = await bundleFactory.exportBundle(entities, {
                entityIds: options.entityIds,
                includeRelationships: options.includeRelationships,
                relationshipDepth: options.relationshipDepth,
                tlpLevel: options.tlpLevel,
                includeExtensions: options.includeExtensions,
                investigationId: options.investigationId,
                caseId: options.caseId,
                producerName: options.producerName,
                labels: options.labels,
            }, authReq.user.userId);
            // Create air-gap package
            const airGapPackage = signingService.createAirGapPackage([result.bundle]);
            const serialized = (0, signing_js_1.serializeAirGapPackage)(airGapPackage);
            ctiLogger.info({
                userId: authReq.user.userId,
                entityCount: entities.length,
                bundleCount: 1,
            }, 'Air-gap package created');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="intelgraph-airgap-${Date.now()}.json"`);
            res.send(serialized);
        }
        catch (error) {
            handleError(res, error, 'Air-gap export failed');
        }
    });
    /**
     * POST /cti/verify
     * Verify a signed bundle or air-gap package
     */
    router.post('/cti/verify', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.READ), async (req, res) => {
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
        }
        catch (error) {
            handleError(res, error, 'Verification failed');
        }
    });
    /**
     * POST /cti/sync
     * Sync entities from IntelGraph to TAXII collection
     */
    router.post('/cti/sync', (0, rbac_middleware_js_1.requirePermission)(types_js_1.CTI_PERMISSIONS.ADMIN), async (req, res) => {
        try {
            const authReq = req;
            const options = syncRequestSchema.parse(req.body);
            const status = await taxiiService.syncFromIntelGraph(options.collectionId, {
                tenantId: authReq.user.tenantId || 'default',
                entityKinds: options.entityKinds,
                since: options.since ? new Date(options.since) : undefined,
                userId: authReq.user.userId,
            });
            ctiLogger.info({
                collectionId: options.collectionId,
                userId: authReq.user.userId,
                successCount: status.success_count,
            }, 'Collection sync completed');
            res.json(status);
        }
        catch (error) {
            handleError(res, error, 'Sync failed');
        }
    });
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
async function fetchEntities(pg, tenantId, entityIds) {
    if (entityIds.length === 0)
        return [];
    const result = await pg.query('SELECT * FROM entities WHERE tenant_id = $1 AND id = ANY($2)', [tenantId, entityIds]);
    return result.rows.map((row) => ({
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
function handleError(res, error, message) {
    ctiLogger.error({ error }, message);
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({
            error: 'Validation Error',
            details: error.errors,
        });
    }
    if (error instanceof Error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                error: 'Not Found',
                message: error.message,
            });
        }
        if (error.message.includes('permission') || error.message.includes('allow')) {
            return res.status(403).json({
                error: 'Forbidden',
                message: error.message,
            });
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
exports.default = createCtiRouter;
