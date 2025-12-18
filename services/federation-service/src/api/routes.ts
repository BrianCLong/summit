/**
 * Federation API Routes
 *
 * Express routes for federation operations:
 * - Push sharing
 * - Pull queries
 * - Subscription management
 * - Agreement management
 */

import express, { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import pino from 'pino';
import {
  SharingAgreement,
  AgreementStatus,
  SharingMode,
  ShareableObjectType,
  ClassificationLevel,
  Jurisdiction,
  LicenseType,
} from '../models/types.js';
import { FederationManager } from '../services/federation-manager.js';
import { PolicyEvaluator } from '../services/policy-evaluator.js';
import { RedactionEngine } from '../services/redaction-engine.js';
import { ProvenanceTracker } from '../services/provenance-tracker.js';
import { AuditLogger } from '../services/audit-logger.js';
import { StixTaxiiMapper } from '../protocols/stix-taxii.js';

const logger = pino({ name: 'api-routes' });
const router = express.Router();

// Initialize services
const policyEvaluator = new PolicyEvaluator();
const redactionEngine = new RedactionEngine();
const provenanceTracker = new ProvenanceTracker();
const auditLogger = new AuditLogger();
const federationManager = new FederationManager(
  policyEvaluator,
  redactionEngine,
  provenanceTracker
);
const stixMapper = new StixTaxiiMapper();

// Mock storage (in production, use database)
const agreements = new Map<string, SharingAgreement>();
const availableObjects: any[] = []; // Mock data source

/**
 * Middleware: Validate request
 */
function validateRequest(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

/**
 * Middleware: Extract audit context
 */
function extractAuditContext(req: Request): any {
  return {
    userId: req.headers['x-user-id'] as string,
    partnerId: req.headers['x-partner-id'] as string,
    requestId: req.headers['x-request-id'] as string,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

/**
 * POST /api/v1/share/push
 * Push share objects to a partner
 */
router.post(
  '/api/v1/share/push',
  [
    body('agreementId').isUUID(),
    body('objects').isArray(),
    body('sharedBy').isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { agreementId, objects, sharedBy, channelId } = req.body;

      // Get agreement
      const agreement = agreements.get(agreementId);
      if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      // Validate sharing mode
      if (agreement.sharingMode !== SharingMode.PUSH) {
        return res.status(400).json({ error: 'Agreement does not support PUSH' });
      }

      const context = extractAuditContext(req);
      context.agreementId = agreementId;
      context.channelId = channelId;

      // Execute share
      const sharePackage = await federationManager.pushShare(
        { agreementId, objects, sharedBy, channelId },
        agreement
      );

      // Audit log
      auditLogger.logSharePush(
        context,
        sharePackage.objects.length,
        sharePackage.objects.map((o) => o.type),
        sharePackage.provenanceLinks,
        true
      );

      res.status(200).json({
        packageId: sharePackage.id,
        objectCount: sharePackage.objects.length,
        sharedAt: sharePackage.sharedAt,
      });
    } catch (error) {
      logger.error({ error }, 'Push share failed');

      const context = extractAuditContext(req);
      auditLogger.logSharePush(
        context,
        0,
        [],
        [],
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/share/pull
 * Pull query for available objects
 */
router.get(
  '/api/v1/share/pull',
  [
    query('agreementId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { agreementId, limit, offset, objectTypes } = req.query;

      // Get agreement
      const agreement = agreements.get(agreementId as string);
      if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      // Validate sharing mode
      if (agreement.sharingMode !== SharingMode.PULL) {
        return res.status(400).json({ error: 'Agreement does not support PULL' });
      }

      const context = extractAuditContext(req);
      context.agreementId = agreementId as string;

      // Execute pull query
      const results = await federationManager.pullQuery(
        {
          agreementId: agreementId as string,
          limit: limit ? parseInt(limit as string) : 100,
          offset: offset ? parseInt(offset as string) : 0,
          objectTypes: objectTypes
            ? (objectTypes as string).split(',') as ShareableObjectType[]
            : undefined,
        },
        agreement,
        availableObjects
      );

      // Audit log
      auditLogger.logSharePull(
        context,
        results.length,
        results.map((o) => o.type),
        true
      );

      res.status(200).json({
        objects: results,
        count: results.length,
      });
    } catch (error) {
      logger.error({ error }, 'Pull query failed');

      const context = extractAuditContext(req);
      auditLogger.logSharePull(
        context,
        0,
        [],
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/v1/agreements
 * Create a new sharing agreement
 */
router.post(
  '/api/v1/agreements',
  [
    body('name').isString(),
    body('sourcePartnerId').isUUID(),
    body('targetPartnerId').isUUID(),
    body('policyConstraints').isObject(),
    body('sharingMode').isIn(Object.values(SharingMode)),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const agreement: SharingAgreement = {
        id: crypto.randomUUID(),
        ...req.body,
        status: AgreementStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate agreement
      const validation = policyEvaluator.validateAgreement(agreement);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }

      // Store agreement
      agreements.set(agreement.id, agreement);

      const context = extractAuditContext(req);
      auditLogger.logAgreementCreate(context, agreement.id, true);

      res.status(201).json(agreement);
    } catch (error) {
      logger.error({ error }, 'Agreement creation failed');

      const context = extractAuditContext(req);
      auditLogger.logAgreementCreate(
        context,
        '',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/agreements/:id
 * Get agreement by ID
 */
router.get('/api/v1/agreements/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const agreement = agreements.get(id);

  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }

  res.status(200).json(agreement);
});

/**
 * GET /api/v1/agreements
 * List all agreements
 */
router.get('/api/v1/agreements', async (req: Request, res: Response) => {
  const allAgreements = Array.from(agreements.values());
  res.status(200).json({
    agreements: allAgreements,
    count: allAgreements.length,
  });
});

/**
 * PUT /api/v1/agreements/:id
 * Update agreement
 */
router.put(
  '/api/v1/agreements/:id',
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const agreement = agreements.get(id);

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    const updated: SharingAgreement = {
      ...agreement,
      ...req.body,
      id, // Preserve ID
      updatedAt: new Date(),
    };

    // Validate
    const validation = policyEvaluator.validateAgreement(updated);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    agreements.set(id, updated);

    const context = extractAuditContext(req);
    auditLogger.logAgreementModify(context, id, true);

    res.status(200).json(updated);
  }
);

/**
 * GET /api/v1/audit
 * Query audit logs
 */
router.get('/api/v1/audit', async (req: Request, res: Response) => {
  const { startDate, endDate, operation, agreementId } = req.query;

  const logs = auditLogger.query({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    operation: operation as string,
    agreementId: agreementId as string,
  });

  res.status(200).json({
    logs,
    count: logs.length,
  });
});

/**
 * GET /api/v1/stix/bundle/:packageId
 * Get share package as STIX bundle
 */
router.get('/api/v1/stix/bundle/:packageId', async (req: Request, res: Response) => {
  // Mock: retrieve package by ID
  // In production, fetch from storage

  res.status(404).json({ error: 'Package not found' });
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'federation-service',
    timestamp: new Date().toISOString(),
  });
});

export default router;
