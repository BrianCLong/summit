// @ts-nocheck
/**
 * Security Admin Routes
 *
 * REST API endpoints for key management and security features.
 *
 * SOC 2 Controls: CC6.1, CC6.7, CC7.2
 *
 * @module routes/security/security-admin
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { keyRotationService } from '../../security/KeyRotationService.js';
import { piiDetector } from '../../privacy/PIIDetector.js';
import { Principal } from '../../types/identity.js';
import logger from '../../utils/logger.js';
import { sensitiveContextMiddleware } from '../../middleware/sensitive-context.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();

// ============================================================================
// Middleware
// ============================================================================

const buildPrincipal = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const principal: Principal = {
    kind: 'user',
    id: user.id,
    tenantId: req.headers['x-tenant-id'] as string || user.tenantId || 'default-tenant',
    roles: [user.role],
    scopes: [],
    user: {
      email: user.email,
      username: user.username,
    },
  };

  (req as any).principal = principal;
  next();
};

const requireSecurityAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'admin', { type: 'security', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'security:admin',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

// ============================================================================
// Key Management Routes
// ============================================================================

/**
 * GET /security/keys
 * List encryption keys
 */
router.get(
  '/keys',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { purpose, status } = req.query as any;

      const envelope = keyRotationService.getKeyInventory(principal.tenantId, {
        purpose: purpose as any,
        status: status as any,
      });

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing keys:', error);
      res.status(500).json({ error: 'Failed to list keys', message: error.message });
    }
  }
);

/**
 * POST /security/keys
 * Generate a new encryption key
 */
router.post(
  '/keys',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { purpose, algorithm } = req.body;

      if (!purpose || !algorithm) {
        res.status(400).json({ error: 'purpose and algorithm are required' });
        return;
      }

      const envelope = await keyRotationService.generateKey(
        purpose,
        algorithm,
        principal.tenantId,
        principal.id
      );

      res.status(201).json(envelope);
    } catch (error: any) {
      logger.error('Error generating key:', error);
      res.status(500).json({ error: 'Failed to generate key', message: error.message });
    }
  }
);

/**
 * POST /security/keys/:id/rotate
 * Rotate an encryption key
 */
router.post(
  '/keys/:id/rotate',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { reason } = req.body;

      const envelope = await keyRotationService.rotateKey(id, principal.id, reason);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error rotating key:', error);
      res.status(500).json({ error: 'Failed to rotate key', message: error.message });
    }
  }
);

/**
 * POST /security/keys/:id/retire
 * Retire an encryption key
 */
router.post(
  '/keys/:id/retire',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { reason } = req.body;

      const envelope = await keyRotationService.retireKey(id, principal.id, reason);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error retiring key:', error);
      res.status(500).json({ error: 'Failed to retire key', message: error.message });
    }
  }
);

/**
 * POST /security/keys/:id/compromise
 * Mark a key as compromised
 */
router.post(
  '/keys/:id/compromise',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ error: 'reason is required' });
        return;
      }

      const envelope = await keyRotationService.markCompromised(id, principal.id, reason);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error marking key compromised:', error);
      res.status(500).json({ error: 'Failed to mark key compromised', message: error.message });
    }
  }
);

/**
 * GET /security/keys/expiring
 * Get keys nearing expiration
 */
router.get(
  '/keys/expiring',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const daysAhead = (req.query.days as any) ? parseInt(req.query.days as string, 10) : 14;

      const envelope = keyRotationService.getKeysNearingExpiry(principal.tenantId, daysAhead);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting expiring keys:', error);
      res.status(500).json({ error: 'Failed to get expiring keys', message: error.message });
    }
  }
);

/**
 * GET /security/keys/history
 * Get key rotation history
 */
router.get(
  '/keys/history',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { keyId } = req.query as any;

      const envelope = keyRotationService.getRotationHistory(
        principal.tenantId,
        keyId as string
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting rotation history:', error);
      res.status(500).json({ error: 'Failed to get history', message: error.message });
    }
  }
);

// ============================================================================
// Key Rotation Policy Routes
// ============================================================================

/**
 * GET /security/policies/rotation
 * Get key rotation policies
 */
router.get(
  '/policies/rotation',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const envelope = keyRotationService.getRotationPolicies();
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting rotation policies:', error);
      res.status(500).json({ error: 'Failed to get policies', message: error.message });
    }
  }
);

/**
 * PUT /security/policies/rotation/:purpose
 * Update a rotation policy
 */
router.put(
  '/policies/rotation/:purpose',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { purpose } = req.params;
      const policy = req.body;

      const envelope = keyRotationService.updateRotationPolicy(purpose as any, policy);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error updating rotation policy:', error);
      res.status(500).json({ error: 'Failed to update policy', message: error.message });
    }
  }
);

// ============================================================================
// PII Scanning Routes
// ============================================================================

/**
 * POST /security/pii/scan
 * Scan data for PII
 */
router.post(
  '/pii/scan',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  sensitiveContextMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { data, type = 'object', includeValue = false } = req.body;

      if (!data) {
        res.status(400).json({ error: 'data is required' });
        return;
      }

      let envelope;
      if (type === 'text') {
        envelope = await piiDetector.scanText(data, { includeValue });
      } else {
        envelope = await piiDetector.scanObject(data, { includeValue });
      }

      res.json({
        ...envelope,
        accessContext: (req as any).sensitiveAccessContext,
      });
    } catch (error: any) {
      logger.error('Error scanning for PII:', error);
      res.status(500).json({ error: 'Failed to scan for PII', message: error.message });
    }
  }
);

/**
 * GET /security/pii/categories
 * Get available PII categories
 */
router.get(
  '/pii/categories',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = piiDetector.getPatternCategories();
      res.json({
        data: categories,
        meta: {
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Error getting PII categories:', error);
      res.status(500).json({ error: 'Failed to get categories', message: error.message });
    }
  }
);

/**
 * POST /security/pii/mask
 * Mask a PII value
 */
router.post(
  '/pii/mask',
  ensureAuthenticated,
  buildPrincipal,
  requireSecurityAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { value, category } = req.body;

      if (!value || !category) {
        res.status(400).json({ error: 'value and category are required' });
        return;
      }

      const masked = piiDetector.maskValue(value, category);

      res.json({
        data: { masked },
        meta: {
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Error masking PII:', error);
      res.status(500).json({ error: 'Failed to mask value', message: error.message });
    }
  }
);

export default router;
