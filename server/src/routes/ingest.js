"use strict";
// @ts-nocheck
/**
 * HTTP Ingest Endpoint
 * Provides REST API for data ingestion with JWT auth and validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const IngestService_js_1 = require("../services/IngestService.js");
const opa_client_js_1 = require("../services/opa-client.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const TenantIsolationGuard_js_1 = require("../tenancy/TenantIsolationGuard.js");
const tenant_js_1 = require("../db/tenant.js");
const require_tenant_context_js_1 = require("../middleware/require-tenant-context.js");
const ingestRouter = (0, express_1.Router)();
exports.ingestRouter = ingestRouter;
const ingestLogger = logger_js_1.default.child({ name: 'IngestAPI' });
// Rate limiting: max 100 requests per 15 minutes per IP
const ingestLimiter = (0, express_rate_limit_1.default)({
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
ingestRouter.post('/api/v1/ingest', ingestLimiter, (0, require_tenant_context_js_1.requireTenantContextMiddleware)(), [
    (0, express_validator_1.body)('tenantId').isString().notEmpty(),
    (0, express_validator_1.body)('sourceType').isString().notEmpty(),
    (0, express_validator_1.body)('sourceId').isString().notEmpty(),
    (0, express_validator_1.body)('entities').isArray().notEmpty(),
    (0, express_validator_1.body)('entities.*.kind').isString().notEmpty(),
    (0, express_validator_1.body)('entities.*.labels').isArray(),
    (0, express_validator_1.body)('entities.*.properties').isObject(),
    (0, express_validator_1.body)('relationships').isArray().optional(),
], async (req, res) => {
    const startTime = Date.now();
    try {
        // Validate request
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }
        const { tenantId, sourceType, sourceId, entities, relationships = [] } = req.body;
        // Authenticate user (from JWT middleware)
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Valid JWT token required',
            });
        }
        // Authorize tenant access
        try {
            await (0, opa_client_js_1.verifyTenantAccess)(user, tenantId, 'ingest:write');
        }
        catch (authError) {
            return res.status(403).json({
                error: 'Forbidden',
                message: authError.message,
            });
        }
        const tenantContext = req.tenant ||
            req.tenantContext;
        if (!tenantContext) {
            return res.status(400).json({
                error: 'TENANT_CONTEXT_REQUIRED',
                message: 'Tenant context is required to ingest data',
            });
        }
        const policyDecision = TenantIsolationGuard_js_1.tenantIsolationGuard.evaluatePolicy(tenantContext, { action: 'ingest:write', resourceTenantId: tenantId });
        if (!policyDecision.allowed) {
            return res
                .status(policyDecision.status || 403)
                .json({ error: 'Forbidden', message: policyDecision.reason });
        }
        const capDecision = await TenantIsolationGuard_js_1.tenantIsolationGuard.enforceIngestionCap(tenantContext);
        res.setHeader('X-Tenant-Ingest-Limit', String(capDecision.limit));
        res.setHeader('X-Tenant-Ingest-Reset', String(Math.ceil(capDecision.reset / 1000)));
        if (capDecision.warning) {
            res.setHeader('Warning', capDecision.warning);
        }
        if (!capDecision.allowed) {
            return res.status(capDecision.status || 429).json({
                error: 'IngestionQuotaExceeded',
                message: capDecision.reason,
            });
        }
        // Estimate payload size for storage quota (Performance: use Content-Length if available)
        // QUO-2: Storage Hard Limit Enforcement
        const contentLength = req.get('content-length');
        const estimatedBytes = contentLength ? parseInt(contentLength, 10) : (JSON.stringify(entities).length + JSON.stringify(relationships).length);
        const storageDecision = await TenantIsolationGuard_js_1.tenantIsolationGuard.enforceStorageQuota(tenantContext, estimatedBytes);
        if (!storageDecision.allowed) {
            return res.status(storageDecision.status || 403).json({
                error: 'StorageQuotaExceeded',
                message: storageDecision.reason,
                limit: storageDecision.limit,
                projected: storageDecision.projected
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
        const ingestService = new IngestService_js_1.IngestService(req.app.get('pg'), req.app.get('neo4j'));
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
    }
    catch (error) {
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
});
/**
 * GET /api/v1/ingest/status/:provenanceId
 * Get status of an ingest job
 */
ingestRouter.get('/api/v1/ingest/status/:provenanceId', (0, require_tenant_context_js_1.requireTenantContextMiddleware)(), async (req, res) => {
    try {
        const { provenanceId } = req.params;
        const user = req.user;
        const tenantContext = req.tenant ||
            req.tenantContext;
        if (!tenantContext) {
            return res.status(400).json({
                error: 'TENANT_CONTEXT_REQUIRED',
                message: 'Tenant context is required to query ingest status',
            });
        }
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Query provenance record
        const pg = req.app.get('pg');
        const { rows } = await (0, tenant_js_1.queryWithTenantContext)(pg, tenantContext, `SELECT * FROM provenance_records WHERE id = $1`, [provenanceId]);
        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Provenance record not found',
            });
        }
        const record = rows[0];
        // Check tenant access
        try {
            await (0, opa_client_js_1.verifyTenantAccess)(user, record.tenant_id, 'entity:read');
        }
        catch {
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
    }
    catch (error) {
        ingestLogger.error({ error }, 'Failed to fetch ingest status');
        res.status(500).json({ error: 'Internal server error' });
    }
});
