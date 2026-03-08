"use strict";
/**
 * Zero-Trust Security API Routes (v4)
 *
 * Production-ready API endpoints for zero-trust security:
 * - HSM key management
 * - Immutable audit ledger
 * - Attestation verification
 *
 * @module routes/v4/zero-trust
 * @version 4.2.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zeroTrustV4Router = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const rbac_js_1 = require("../../middleware/rbac.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const index_js_1 = require("../../security/zero-trust/index.js");
// =============================================================================
// Service Initialization
// =============================================================================
let zeroTrustService = null;
const initializeServices = async () => {
    if (!zeroTrustService) {
        zeroTrustService = (0, index_js_1.createZeroTrustService)({
            hsm: {
                providers: [
                    {
                        name: process.env.HSM_PROVIDER || 'Software HSM',
                        type: process.env.HSM_TYPE || 'software_hsm',
                    },
                ],
            },
            audit: {
                merkleTreeBatchSize: 100,
                blockchainType: process.env.BLOCKCHAIN_TYPE || 'rfc3161',
            },
        });
        await zeroTrustService.initialize();
        logger_js_1.default.info('Zero-Trust services initialized');
    }
};
// =============================================================================
// Helper Functions
// =============================================================================
const getTenantId = (req) => {
    return req.tenantId || req.user?.tenantId || 'default';
};
const getUserId = (req) => {
    return req.user?.id || req.user?.id || 'anonymous';
};
const wrapResponse = (data, req) => {
    return {
        data,
        metadata: {
            requestId: req.correlationId || (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            version: '4.2.0',
        },
        governance: {
            action: 'ALLOW',
            reasons: ['Zero-trust operation authorized'],
            policyIds: ['zero-trust-v4'],
            metadata: {
                timestamp: new Date().toISOString(),
                evaluator: 'zero-trust-router',
                latencyMs: 0,
                simulation: false,
            },
            provenance: {
                origin: 'zero-trust-api-v4',
                confidence: 1.0,
            },
        },
    };
};
// =============================================================================
// Router
// =============================================================================
const router = (0, express_1.Router)();
exports.zeroTrustV4Router = router;
// Initialize services middleware
router.use(async (_req, _res, next) => {
    try {
        await initializeServices();
        next();
    }
    catch (error) {
        logger_js_1.default.error({ error }, 'Failed to initialize zero-trust services');
        next(error);
    }
});
// =============================================================================
// HSM Key Management Endpoints
// =============================================================================
/**
 * @swagger
 * /api/v4/zero-trust/hsm/keys:
 *   post:
 *     summary: Generate a new HSM-protected key
 *     tags: [Zero-Trust - HSM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyType
 *               - purpose
 *             properties:
 *               keyType:
 *                 type: string
 *                 enum: [RSA, EC, AES, CHACHA20]
 *               keySize:
 *                 type: integer
 *               curve:
 *                 type: string
 *                 enum: [P-256, P-384, P-521, Ed25519]
 *               purpose:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [encrypt, decrypt, sign, verify, wrap, unwrap, derive]
 *               extractable:
 *                 type: boolean
 *               persistent:
 *                 type: boolean
 *               labels:
 *                 type: object
 *     responses:
 *       201:
 *         description: Key generated
 */
router.post('/hsm/keys', (0, rbac_js_1.requirePermission)('security:keys:create'), async (req, res) => {
    try {
        const spec = {
            keyType: req.body.keyType,
            keySize: req.body.keySize,
            curve: req.body.curve,
            purpose: req.body.purpose,
            extractable: req.body.extractable ?? false,
            persistent: req.body.persistent ?? true,
            labels: {
                ...req.body.labels,
                tenantId: getTenantId(req),
                createdBy: getUserId(req),
            },
        };
        const keyHandle = await zeroTrustService.hsm.generateKey(spec);
        logger_js_1.default.info({
            keyId: keyHandle.id,
            keyType: spec.keyType,
            tenantId: getTenantId(req),
            createdBy: getUserId(req),
        }, 'HSM key generated');
        // Record audit event
        await zeroTrustService.recordSecurityEvent(getUserId(req), 'user', getTenantId(req), 'key:generate', { keyId: keyHandle.id, keyType: spec.keyType });
        res.status(201).json(wrapResponse(keyHandle, req));
    }
    catch (error) {
        logger_js_1.default.error({ error }, 'Failed to generate HSM key');
        res.status(500).json({
            error: {
                code: error.code || 'HSM_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/hsm/keys/{id}:
 *   get:
 *     summary: Get key handle information
 *     tags: [Zero-Trust - HSM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key handle
 *       404:
 *         description: Key not found
 */
router.get('/hsm/keys/:id', (0, rbac_js_1.requirePermission)('security:keys:read'), async (req, res) => {
    try {
        const keyHandle = await zeroTrustService.hsm.getKey(req.params.id);
        if (!keyHandle) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: `Key not found: ${req.params.id}`,
                },
            });
        }
        res.json(wrapResponse(keyHandle, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: error.code || 'HSM_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/hsm/keys/{id}/sign:
 *   post:
 *     summary: Sign data with HSM key
 *     tags: [Zero-Trust - HSM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: Base64 encoded data to sign
 *               algorithm:
 *                 type: string
 *     responses:
 *       200:
 *         description: Signature
 */
router.post('/hsm/keys/:id/sign', (0, rbac_js_1.requirePermission)('security:keys:use'), async (req, res) => {
    try {
        const data = Buffer.from(req.body.data, 'base64');
        const signature = await zeroTrustService.hsm.sign(req.params.id, data, req.body.algorithm);
        // Record audit event
        await zeroTrustService.recordSecurityEvent(getUserId(req), 'user', getTenantId(req), 'key:sign', { keyId: req.params.id });
        res.json(wrapResponse({
            keyId: req.params.id,
            signature: signature.toString('base64'),
            algorithm: req.body.algorithm,
            timestamp: new Date().toISOString(),
        }, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: error.code || 'SIGN_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/hsm/keys/{id}/verify:
 *   post:
 *     summary: Verify signature with HSM key
 *     tags: [Zero-Trust - HSM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - signature
 *             properties:
 *               data:
 *                 type: string
 *               signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
router.post('/hsm/keys/:id/verify', (0, rbac_js_1.requirePermission)('security:keys:use'), async (req, res) => {
    try {
        const data = Buffer.from(req.body.data, 'base64');
        const signature = Buffer.from(req.body.signature, 'base64');
        const valid = await zeroTrustService.hsm.verify(req.params.id, data, signature);
        res.json(wrapResponse({
            keyId: req.params.id,
            valid,
            timestamp: new Date().toISOString(),
        }, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: error.code || 'VERIFY_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/hsm/keys/{id}/rotate:
 *   post:
 *     summary: Rotate HSM key
 *     tags: [Zero-Trust - HSM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: New key handle
 */
router.post('/hsm/keys/:id/rotate', (0, rbac_js_1.requirePermission)('security:keys:rotate'), async (req, res) => {
    try {
        const newKeyHandle = await zeroTrustService.hsm.rotateKey(req.params.id);
        logger_js_1.default.info({
            oldKeyId: req.params.id,
            newKeyId: newKeyHandle.id,
            rotatedBy: getUserId(req),
        }, 'HSM key rotated');
        // Record audit event
        await zeroTrustService.recordSecurityEvent(getUserId(req), 'user', getTenantId(req), 'key:rotate', { oldKeyId: req.params.id, newKeyId: newKeyHandle.id });
        res.json(wrapResponse(newKeyHandle, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: error.code || 'ROTATE_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/hsm/keys/{id}/attest:
 *   get:
 *     summary: Get key attestation
 *     tags: [Zero-Trust - HSM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key attestation
 */
router.get('/hsm/keys/:id/attest', (0, rbac_js_1.requirePermission)('security:keys:read'), async (req, res) => {
    try {
        const attestation = await zeroTrustService.hsm.attestKey(req.params.id);
        res.json(wrapResponse(attestation, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: error.code || 'ATTEST_ERROR',
                message: error.message,
            },
        });
    }
});
// =============================================================================
// Immutable Audit Ledger Endpoints
// =============================================================================
/**
 * @swagger
 * /api/v4/zero-trust/audit/events:
 *   post:
 *     summary: Record audit event
 *     tags: [Zero-Trust - Audit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entryType
 *               - payload
 *             properties:
 *               entryType:
 *                 type: string
 *                 enum: [access, modification, deletion, governance_decision, key_operation, attestation, policy_change, security_event]
 *               payload:
 *                 type: object
 *               resourceType:
 *                 type: string
 *               resourceId:
 *                 type: string
 *               action:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event recorded
 */
router.post('/audit/events', (0, rbac_js_1.requirePermission)('audit:write'), async (req, res) => {
    try {
        const entry = await zeroTrustService.audit.recordEvent({
            timestamp: new Date().toISOString(),
            entryType: req.body.entryType,
            payload: req.body.payload,
            metadata: {
                actorId: getUserId(req),
                actorType: 'user',
                tenantId: getTenantId(req),
                resourceType: req.body.resourceType || 'unknown',
                resourceId: req.body.resourceId || 'unknown',
                action: req.body.action || 'record',
                outcome: 'success',
                correlationId: req.correlationId,
            },
        });
        res.status(201).json(wrapResponse(entry, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: 'AUDIT_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/audit/events:
 *   get:
 *     summary: Query audit events
 *     tags: [Zero-Trust - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: resourceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: entryType
 *         schema:
 *           type: string
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit entries
 */
router.get('/audit/events', (0, rbac_js_1.requirePermission)('audit:read'), async (req, res) => {
    try {
        const query = {
            tenantId: getTenantId(req),
            actorId: req.query.actorId,
            resourceType: req.query.resourceType,
            resourceId: String(req.query.resourceId || ""),
            entryTypes: req.query.entryType
                ? [req.query.entryType]
                : undefined,
            startTime: req.query.startTime,
            endTime: req.query.endTime,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0,
        };
        const entries = await zeroTrustService.audit.queryEntries(query);
        res.json(wrapResponse({
            entries,
            total: entries.length,
            query,
        }, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: 'QUERY_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/audit/events/{id}:
 *   get:
 *     summary: Get audit event by ID
 *     tags: [Zero-Trust - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit entry
 *       404:
 *         description: Entry not found
 */
router.get('/audit/events/:id', (0, rbac_js_1.requirePermission)('audit:read'), async (req, res) => {
    try {
        const entry = await zeroTrustService.audit.getEntry(req.params.id);
        if (!entry) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: `Audit entry not found: ${req.params.id}`,
                },
            });
        }
        res.json(wrapResponse(entry, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: 'QUERY_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/audit/events/{id}/verify:
 *   get:
 *     summary: Verify audit entry integrity
 *     tags: [Zero-Trust - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
router.get('/audit/events/:id/verify', (0, rbac_js_1.requirePermission)('audit:verify'), async (req, res) => {
    try {
        const verification = await zeroTrustService.audit.verifyEntry(req.params.id);
        res.json(wrapResponse(verification, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: 'VERIFY_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/audit/events/{id}/merkle-proof:
 *   get:
 *     summary: Get Merkle proof for audit entry
 *     tags: [Zero-Trust - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Merkle proof
 */
router.get('/audit/events/:id/merkle-proof', (0, rbac_js_1.requirePermission)('audit:read'), async (req, res) => {
    try {
        const proof = await zeroTrustService.audit.getMerkleProof(req.params.id);
        res.json(wrapResponse(proof, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: 'PROOF_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/audit/chain/verify:
 *   post:
 *     summary: Verify audit chain integrity
 *     tags: [Zero-Trust - Audit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Chain verification result
 */
router.post('/audit/chain/verify', (0, rbac_js_1.requirePermission)('audit:verify'), async (req, res) => {
    try {
        const result = await zeroTrustService.verifyAuditIntegrity(req.body.startTime, req.body.endTime);
        logger_js_1.default.info({
            entriesVerified: result.entriesVerified,
            valid: result.valid,
            verifiedBy: getUserId(req),
        }, 'Audit chain verified');
        res.json(wrapResponse(result, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: 'CHAIN_VERIFY_ERROR',
                message: error.message,
            },
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/audit/export:
 *   post:
 *     summary: Export audit bundle for compliance
 *     tags: [Zero-Trust - Audit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               resourceType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Audit bundle
 */
router.post('/audit/export', (0, rbac_js_1.requirePermission)('audit:export'), async (req, res) => {
    try {
        const query = {
            tenantId: getTenantId(req),
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            resourceType: req.body.resourceType,
        };
        const bundle = await zeroTrustService.audit.exportAuditBundle(query);
        logger_js_1.default.info({
            bundleId: bundle.id,
            entryCount: bundle.entries.length,
            exportedBy: getUserId(req),
        }, 'Audit bundle exported');
        res.json(wrapResponse(bundle, req));
    }
    catch (error) {
        res.status(500).json({
            error: {
                code: 'EXPORT_ERROR',
                message: error.message,
            },
        });
    }
});
// =============================================================================
// Health & Status Endpoints
// =============================================================================
/**
 * @swagger
 * /api/v4/zero-trust/health:
 *   get:
 *     summary: Zero-Trust service health check
 *     tags: [Zero-Trust]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', async (_req, res) => {
    try {
        const status = {
            status: zeroTrustService?.isInitialized() ? 'healthy' : 'initializing',
            services: {
                hsm: 'active',
                auditLedger: 'active',
            },
            timestamp: new Date().toISOString(),
            version: '4.2.0',
        };
        res.json(status);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * @swagger
 * /api/v4/zero-trust/providers:
 *   get:
 *     summary: List available HSM providers
 *     tags: [Zero-Trust - HSM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: HSM providers
 */
router.get('/providers', (0, rbac_js_1.requirePermission)('security:read'), async (req, res) => {
    const providers = [
        {
            id: 'software-hsm',
            name: 'Software HSM (Development)',
            type: 'software_hsm',
            status: 'active',
            fipsCompliant: false,
        },
        {
            id: 'aws-cloudhsm',
            name: 'AWS CloudHSM',
            type: 'aws_cloudhsm',
            status: process.env.AWS_HSM_ENABLED === 'true' ? 'active' : 'disabled',
            fipsCompliant: true,
        },
        {
            id: 'azure-managed-hsm',
            name: 'Azure Managed HSM',
            type: 'azure_managed_hsm',
            status: process.env.AZURE_HSM_ENABLED === 'true' ? 'active' : 'disabled',
            fipsCompliant: true,
        },
    ];
    res.json(wrapResponse(providers, req));
});
exports.default = router;
