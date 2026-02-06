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

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requirePermission, requireRole } from '../../middleware/rbac.js';
import logger from '../../utils/logger.js';
import {
  ZeroTrustService,
  createZeroTrustService,
  HSMServiceImpl,
  ImmutableAuditServiceImpl,
} from '../../security/zero-trust/index.js';
import {
  HSMKeySpec,
  HSMKeyHandle,
  AuditLedgerEntry,
  AuditQuery,
  IntegrityVerification,
  MerkleProof,
} from '../../security/zero-trust/types.js';
import type { GovernanceVerdict } from '../../governance/types.js';

// =============================================================================
// Types
// =============================================================================

// Use the Request type directly - user is defined in global Express declarations

interface DataEnvelope<T> {
  data: T;
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
  };
  governance: GovernanceVerdict;
}

// =============================================================================
// Service Initialization
// =============================================================================

let zeroTrustService: ZeroTrustService | null = null;

const initializeServices = async () => {
  if (!zeroTrustService) {
    zeroTrustService = createZeroTrustService({
      hsm: {
        providers: [
          {
            name: process.env.HSM_PROVIDER || 'Software HSM',
            type: (process.env.HSM_TYPE as any) || 'software_hsm',
          },
        ],
      },
      audit: {
        merkleTreeBatchSize: 100,
        blockchainType: (process.env.BLOCKCHAIN_TYPE as any) || 'rfc3161',
      },
    });

    await zeroTrustService.initialize();
    logger.info('Zero-Trust services initialized');
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const getTenantId = (req: Request): string => {
  return req.tenantId || req.user?.tenantId || 'default';
};

const getUserId = (req: Request): string => {
  return req.user?.id || req.user?.id || 'anonymous';
};

const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';

const wrapResponse = <T>(data: T, req: Request): DataEnvelope<T> => {
  return {
    data,
    metadata: {
      requestId: req.correlationId || randomUUID(),
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

const router = Router();

// Initialize services middleware
router.use(async (_req, _res, next) => {
  try {
    await initializeServices();
    next();
  } catch (error: any) {
    logger.error({ error }, 'Failed to initialize zero-trust services');
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
router.post(
  '/hsm/keys',
  requirePermission('security:keys:create'),
  async (req: Request, res: Response) => {
    try {
      const spec: HSMKeySpec = {
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

      const keyHandle = await zeroTrustService!.hsm.generateKey(spec);

      logger.info({
        keyId: keyHandle.id,
        keyType: spec.keyType,
        tenantId: getTenantId(req),
        createdBy: getUserId(req),
      }, 'HSM key generated');

      // Record audit event
      await zeroTrustService!.recordSecurityEvent(
        getUserId(req),
        'user',
        getTenantId(req),
        'key:generate',
        { keyId: keyHandle.id, keyType: spec.keyType }
      );

      res.status(201).json(wrapResponse(keyHandle, req));
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate HSM key');
      res.status(500).json({
        error: {
          code: error.code || 'HSM_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.get(
  '/hsm/keys/:id',
  requirePermission('security:keys:read'),
  async (req: Request, res: Response) => {
    try {
      const keyId = singleParam(req.params.id);
      const keyHandle = await zeroTrustService!.hsm.getKey(keyId);

      if (!keyHandle) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Key not found: ${keyId}`,
          },
        });
      }

      res.json(wrapResponse(keyHandle, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: error.code || 'HSM_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.post(
  '/hsm/keys/:id/sign',
  requirePermission('security:keys:use'),
  async (req: Request, res: Response) => {
    try {
      const keyId = singleParam(req.params.id);
      const data = Buffer.from(req.body.data, 'base64');
      const signature = await zeroTrustService!.hsm.sign(
        keyId,
        data,
        req.body.algorithm
      );

      // Record audit event
      await zeroTrustService!.recordSecurityEvent(
        getUserId(req),
        'user',
        getTenantId(req),
        'key:sign',
        { keyId }
      );

      res.json(wrapResponse({
        keyId,
        signature: signature.toString('base64'),
        algorithm: req.body.algorithm,
        timestamp: new Date().toISOString(),
      }, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: error.code || 'SIGN_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.post(
  '/hsm/keys/:id/verify',
  requirePermission('security:keys:use'),
  async (req: Request, res: Response) => {
    try {
      const keyId = singleParam(req.params.id);
      const data = Buffer.from(req.body.data, 'base64');
      const signature = Buffer.from(req.body.signature, 'base64');
      const valid = await zeroTrustService!.hsm.verify(keyId, data, signature);

      res.json(wrapResponse({
        keyId,
        valid,
        timestamp: new Date().toISOString(),
      }, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: error.code || 'VERIFY_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.post(
  '/hsm/keys/:id/rotate',
  requirePermission('security:keys:rotate'),
  async (req: Request, res: Response) => {
    try {
      const keyId = singleParam(req.params.id);
      const newKeyHandle = await zeroTrustService!.hsm.rotateKey(keyId);

      logger.info({
        oldKeyId: keyId,
        newKeyId: newKeyHandle.id,
        rotatedBy: getUserId(req),
      }, 'HSM key rotated');

      // Record audit event
      await zeroTrustService!.recordSecurityEvent(
        getUserId(req),
        'user',
        getTenantId(req),
        'key:rotate',
        { oldKeyId: keyId, newKeyId: newKeyHandle.id }
      );

      res.json(wrapResponse(newKeyHandle, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: error.code || 'ROTATE_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.get(
  '/hsm/keys/:id/attest',
  requirePermission('security:keys:read'),
  async (req: Request, res: Response) => {
    try {
      const keyId = singleParam(req.params.id);
      const attestation = await zeroTrustService!.hsm.attestKey(keyId);
      res.json(wrapResponse(attestation, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: error.code || 'ATTEST_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.post(
  '/audit/events',
  requirePermission('audit:write'),
  async (req: Request, res: Response) => {
    try {
      const entry = await zeroTrustService!.audit.recordEvent({
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
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'AUDIT_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.get(
  '/audit/events',
  requirePermission('audit:read'),
  async (req: Request, res: Response) => {
    try {
      const query: AuditQuery = {
        tenantId: getTenantId(req),
        actorId: req.query.actorId as string,
        resourceType: req.query.resourceType as string,
        resourceId: req.query.resourceId as string,
        entryTypes: req.query.entryType
          ? [req.query.entryType as any]
          : undefined,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
        limit: parseInt(req.query.limit as string) || 100,
        offset: parseInt(req.query.offset as string) || 0,
      };

      const entries = await zeroTrustService!.audit.queryEntries(query);

      res.json(wrapResponse({
        entries,
        total: entries.length,
        query,
      }, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'QUERY_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.get(
  '/audit/events/:id',
  requirePermission('audit:read'),
  async (req: Request, res: Response) => {
    try {
      const entryId = singleParam(req.params.id);
      const entry = await zeroTrustService!.audit.getEntry(entryId);

      if (!entry) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Audit entry not found: ${entryId}`,
          },
        });
      }

      res.json(wrapResponse(entry, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'QUERY_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.get(
  '/audit/events/:id/verify',
  requirePermission('audit:verify'),
  async (req: Request, res: Response) => {
    try {
      const entryId = singleParam(req.params.id);
      const verification = await zeroTrustService!.audit.verifyEntry(entryId);
      res.json(wrapResponse(verification, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'VERIFY_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.get(
  '/audit/events/:id/merkle-proof',
  requirePermission('audit:read'),
  async (req: Request, res: Response) => {
    try {
      const entryId = singleParam(req.params.id);
      const proof = await zeroTrustService!.audit.getMerkleProof(entryId);
      res.json(wrapResponse(proof, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'PROOF_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.post(
  '/audit/chain/verify',
  requirePermission('audit:verify'),
  async (req: Request, res: Response) => {
    try {
      const result = await zeroTrustService!.verifyAuditIntegrity(
        req.body.startTime,
        req.body.endTime
      );

      logger.info({
        entriesVerified: result.entriesVerified,
        valid: result.valid,
        verifiedBy: getUserId(req),
      }, 'Audit chain verified');

      res.json(wrapResponse(result, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'CHAIN_VERIFY_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.post(
  '/audit/export',
  requirePermission('audit:export'),
  async (req: Request, res: Response) => {
    try {
      const query: AuditQuery = {
        tenantId: getTenantId(req),
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        resourceType: req.body.resourceType,
      };

      const bundle = await zeroTrustService!.audit.exportAuditBundle(query);

      logger.info({
        bundleId: bundle.id,
        entryCount: bundle.entries.length,
        exportedBy: getUserId(req),
      }, 'Audit bundle exported');

      res.json(wrapResponse(bundle, req));
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'EXPORT_ERROR',
          message: error.message,
        },
      });
    }
  }
);

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
router.get('/health', async (_req: Request, res: Response) => {
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
  } catch (error: any) {
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
router.get(
  '/providers',
  requirePermission('security:read'),
  async (req: Request, res: Response) => {
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
  }
);

export default router;
export { router as zeroTrustV4Router };
