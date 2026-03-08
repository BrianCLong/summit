"use strict";
/**
 * Provenance Ledger Beta API Routes
 * REST API for source tracking, transforms, evidence, claims, and export manifests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const provenance_ledger_beta_js_1 = require("../services/provenance-ledger-beta.js");
const evidence_registration_flow_js_1 = require("../services/evidence-registration-flow.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
const provenanceLedger = provenance_ledger_beta_js_1.ProvenanceLedgerBetaService.getInstance();
// ============================================================================
// LICENSE ENDPOINTS
// ============================================================================
/**
 * POST /api/provenance-beta/licenses
 * Create a new license
 */
router.post('/licenses', async (req, res) => {
    try {
        const input = req.body;
        const license = await provenanceLedger.createLicense(input);
        res.status(201).json({
            success: true,
            data: license,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to create license',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'License creation failed',
        });
    }
});
/**
 * GET /api/provenance-beta/licenses/:id
 * Get a license by ID
 */
router.get('/licenses/:id', async (req, res) => {
    try {
        const licenseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const license = await provenanceLedger.getLicense(licenseId);
        if (!license) {
            return res.status(404).json({
                success: false,
                error: 'License not found',
            });
        }
        res.json({
            success: true,
            data: license,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to get license',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get license',
        });
    }
});
// ============================================================================
// SOURCE ENDPOINTS
// ============================================================================
/**
 * POST /api/provenance-beta/sources
 * Register a new source
 */
router.post('/sources', async (req, res) => {
    try {
        const input = req.body;
        const source = await provenanceLedger.registerSource(input);
        res.status(201).json({
            success: true,
            data: source,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to register source',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Source registration failed',
        });
    }
});
/**
 * GET /api/provenance-beta/sources/:id
 * Get a source by ID
 */
router.get('/sources/:id', async (req, res) => {
    try {
        const sourceId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const source = await provenanceLedger.getSource(sourceId);
        if (!source) {
            return res.status(404).json({
                success: false,
                error: 'Source not found',
            });
        }
        res.json({
            success: true,
            data: source,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to get source',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get source',
        });
    }
});
// ============================================================================
// TRANSFORM ENDPOINTS
// ============================================================================
/**
 * POST /api/provenance-beta/transforms
 * Register a new transform
 */
router.post('/transforms', async (req, res) => {
    try {
        const input = req.body;
        const transform = await provenanceLedger.registerTransform(input);
        res.status(201).json({
            success: true,
            data: transform,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to register transform',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Transform registration failed',
        });
    }
});
/**
 * GET /api/provenance-beta/transforms/:id
 * Get a transform by ID
 */
router.get('/transforms/:id', async (req, res) => {
    try {
        const transformId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const transform = await provenanceLedger.getTransform(transformId);
        if (!transform) {
            return res.status(404).json({
                success: false,
                error: 'Transform not found',
            });
        }
        res.json({
            success: true,
            data: transform,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to get transform',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get transform',
        });
    }
});
// ============================================================================
// EVIDENCE ENDPOINTS
// ============================================================================
/**
 * POST /api/provenance-beta/evidence
 * Register new evidence
 */
router.post('/evidence', async (req, res) => {
    try {
        const input = req.body;
        const evidence = await provenanceLedger.registerEvidence(input);
        res.status(201).json({
            success: true,
            data: evidence,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to register evidence',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Evidence registration failed',
        });
    }
});
/**
 * GET /api/provenance-beta/evidence/:id
 * Get evidence by ID
 */
router.get('/evidence/:id', async (req, res) => {
    try {
        const evidenceId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const evidence = await provenanceLedger.getEvidence(evidenceId);
        if (!evidence) {
            return res.status(404).json({
                success: false,
                error: 'Evidence not found',
            });
        }
        res.json({
            success: true,
            data: evidence,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to get evidence',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get evidence',
        });
    }
});
// ============================================================================
// CLAIM ENDPOINTS
// ============================================================================
/**
 * POST /api/provenance-beta/claims
 * Register a new claim
 */
router.post('/claims', async (req, res) => {
    try {
        const input = req.body;
        const claim = await provenanceLedger.registerClaim(input);
        res.status(201).json({
            success: true,
            data: claim,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to register claim',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Claim registration failed',
        });
    }
});
/**
 * GET /api/provenance-beta/claims/:id
 * Get a claim by ID with full provenance
 */
router.get('/claims/:id', async (req, res) => {
    try {
        const claimId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const claim = await provenanceLedger.getClaim(claimId);
        if (!claim) {
            return res.status(404).json({
                success: false,
                error: 'Claim not found',
            });
        }
        // Optionally include full provenance chain
        if ((0, http_param_js_1.firstString)(req.query.include_provenance) === 'true') {
            const provenance = await provenanceLedger.getProvenanceChain(claimId);
            return res.json({
                success: true,
                data: {
                    ...claim,
                    provenance,
                },
            });
        }
        res.json({
            success: true,
            data: claim,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to get claim',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get claim',
        });
    }
});
/**
 * GET /api/provenance-beta/claims
 * Query claims with filters
 */
router.get('/claims', async (req, res) => {
    try {
        const filters = {
            investigation_id: (0, http_param_js_1.firstString)(req.query.investigation_id),
            created_by: (0, http_param_js_1.firstString)(req.query.created_by),
            claim_type: (0, http_param_js_1.firstString)(req.query.claim_type),
            confidence_min: (0, http_param_js_1.firstString)(req.query.confidence_min)
                ? parseFloat((0, http_param_js_1.firstStringOr)(req.query.confidence_min, '0'))
                : undefined,
            confidence_max: (0, http_param_js_1.firstString)(req.query.confidence_max)
                ? parseFloat((0, http_param_js_1.firstStringOr)(req.query.confidence_max, '0'))
                : undefined,
            source_id: (0, http_param_js_1.firstString)(req.query.source_id),
        };
        const claims = await provenanceLedger.queryClaims(filters);
        res.json({
            success: true,
            data: claims,
            count: claims.length,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to query claims',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to query claims',
        });
    }
});
/**
 * POST /api/provenance-beta/claims/:claimId/evidence
 * Link evidence to a claim
 */
router.post('/claims/:claimId/evidence', async (req, res) => {
    try {
        const input = {
            claim_id: (0, http_param_js_1.firstStringOr)(req.params.claimId, ''),
            ...req.body,
        };
        const link = await provenanceLedger.linkClaimToEvidence(input);
        res.status(201).json({
            success: true,
            data: link,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to link claim to evidence',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to link claim to evidence',
        });
    }
});
/**
 * GET /api/provenance-beta/claims/:claimId/evidence
 * Get all evidence linked to a claim
 */
router.get('/claims/:claimId/evidence', async (req, res) => {
    try {
        const links = await provenanceLedger.getClaimEvidenceLinks((0, http_param_js_1.firstStringOr)(req.params.claimId, ''));
        res.json({
            success: true,
            data: links,
            count: links.length,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to get claim evidence links',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to get claim evidence links',
        });
    }
});
/**
 * GET /api/provenance-beta/evidence/:evidenceId/claims
 * Get all claims linked to evidence
 */
router.get('/evidence/:evidenceId/claims', async (req, res) => {
    try {
        const links = await provenanceLedger.getEvidenceClaimLinks((0, http_param_js_1.firstStringOr)(req.params.evidenceId, ''));
        res.json({
            success: true,
            data: links,
            count: links.length,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to get evidence claim links',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to get evidence claim links',
        });
    }
});
// ============================================================================
// PROVENANCE CHAIN ENDPOINTS
// ============================================================================
/**
 * GET /api/provenance-beta/chain/:itemId
 * Get complete provenance chain for an item
 */
router.get('/chain/:itemId', async (req, res) => {
    try {
        const itemId = (0, http_param_js_1.firstStringOr)(req.params.itemId, '');
        const chain = await provenanceLedger.getProvenanceChain(itemId);
        res.json({
            success: true,
            data: chain,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to get provenance chain',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get provenance chain',
        });
    }
});
// ============================================================================
// EXPORT MANIFEST ENDPOINTS
// ============================================================================
/**
 * POST /api/provenance-beta/export
 * Create an export manifest
 */
router.post('/export', async (req, res) => {
    try {
        const input = req.body;
        const manifest = await provenanceLedger.createExportManifest(input);
        res.status(201).json({
            success: true,
            data: manifest,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to create export manifest',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Export manifest creation failed',
        });
    }
});
/**
 * GET /api/provenance-beta/export/:manifestId/verify
 * Verify an export manifest
 */
router.get('/export/:manifestId/verify', async (req, res) => {
    try {
        const report = await provenanceLedger.verifyManifest((0, http_param_js_1.firstStringOr)(req.params.manifestId, ''));
        res.json({
            success: true,
            data: report,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to verify manifest',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Verification failed',
        });
    }
});
// ============================================================================
// DOCUMENT INGESTION ENDPOINT
// ============================================================================
/**
 * POST /api/provenance-beta/ingest
 * Complete document ingestion flow
 */
router.post('/ingest', async (req, res) => {
    try {
        const { documentPath, documentContent, userId, investigationId, licenseId, metadata, } = req.body;
        if (!documentContent || !userId || !licenseId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: documentContent, userId, licenseId',
            });
        }
        const result = await (0, evidence_registration_flow_js_1.ingestDocument)({
            documentPath: documentPath || 'inline-document',
            documentContent,
            userId,
            investigationId,
            licenseId,
            metadata,
        });
        res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to ingest document',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Document ingestion failed',
        });
    }
});
// ============================================================================
// AUDIT CHAIN VERIFICATION ENDPOINT
// ============================================================================
/**
 * POST /api/provenance-beta/audit/verify
 * Verify the integrity of the audit chain
 */
router.post('/audit/verify', async (req, res) => {
    try {
        const options = {
            startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            limit: req.body.limit ? parseInt(req.body.limit) : undefined,
        };
        const result = await provenanceLedger.verifyAuditChain(options);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Failed to verify audit chain',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Audit chain verification failed',
        });
    }
});
// ============================================================================
// HEALTH CHECK
// ============================================================================
/**
 * GET /api/provenance-beta/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'provenance-ledger-beta',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
