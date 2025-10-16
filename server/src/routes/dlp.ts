/**
 * DLP Management API Routes
 *
 * REST endpoints for managing DLP policies and monitoring violations.
 */

import { Router, Request, Response } from 'express';
import { dlpService, DLPPolicy } from '../services/DLPService.js';
import { dlpStatusMiddleware } from '../middleware/dlpMiddleware.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/withAuthAndPolicy.js';
import logger from '../utils/logger.js';
import { AppError } from '../lib/errors.js';
import { param, body, query, validationResult } from 'express-validator';

const router = Router();

// Apply authentication to all DLP routes
router.use(authMiddleware);

/**
 * GET /api/dlp/status
 * Get DLP service status and policy summary
 */
router.get('/status', dlpStatusMiddleware);

/**
 * GET /api/dlp/policies
 * List all DLP policies
 */
router.get(
  '/policies',
  rbacMiddleware(['admin', 'security_officer']),
  async (req: Request, res: Response) => {
    try {
      const policies = dlpService.listPolicies();

      // Filter sensitive information for non-admin users
      const filteredPolicies = policies.map((policy) => ({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        enabled: policy.enabled,
        priority: policy.priority,
        actionTypes: policy.actions.map((a) => a.type),
        exemptionCount: policy.exemptions.length,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      }));

      res.json({
        success: true,
        data: filteredPolicies,
        meta: {
          total: policies.length,
          enabled: policies.filter((p) => p.enabled).length,
          disabled: policies.filter((p) => !p.enabled).length,
        },
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to list DLP policies', {
        component: 'DLPRoutes',
        error: err.message,
        userId: (req as any).user?.id,
      });
      throw new AppError('Failed to retrieve DLP policies', 500);
    }
  },
);

/**
 * GET /api/dlp/policies/:id
 * Get a specific DLP policy
 */
router.get(
  '/policies/:id',
  rbacMiddleware(['admin', 'security_officer']),
  param('id').isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid policy ID', 400, 'VALIDATION_ERROR');
      }

      const policy = dlpService.getPolicy(req.params.id);
      if (!policy) {
        throw new AppError('DLP policy not found', 404);
      }

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const err = error as Error;
      logger.error('Failed to get DLP policy', {
        component: 'DLPRoutes',
        error: err.message,
        policyId: req.params.id,
        userId: (req as any).user?.id,
      });
      throw new AppError('Failed to retrieve DLP policy', 500);
    }
  },
);

/**
 * POST /api/dlp/policies
 * Create a new DLP policy
 */
router.post(
  '/policies',
  rbacMiddleware(['admin']),
  body('name').isString().notEmpty().isLength({ min: 1, max: 100 }),
  body('description').isString().optional().isLength({ max: 500 }),
  body('enabled').isBoolean().optional(),
  body('priority').isInt({ min: 1, max: 100 }).optional(),
  body('conditions').isArray({ min: 1 }),
  body('actions').isArray({ min: 1 }),
  body('exemptions').isArray().optional(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          errors: errors.array(),
        });
      }

      const policyData = {
        name: req.body.name,
        description: req.body.description || '',
        enabled: req.body.enabled ?? true,
        priority: req.body.priority || 10,
        conditions: req.body.conditions,
        actions: req.body.actions,
        exemptions: req.body.exemptions || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate policy structure
      validatePolicyStructure(policyData);

      dlpService.addPolicy(policyData);

      logger.info('DLP policy created', {
        component: 'DLPRoutes',
        policyName: policyData.name,
        createdBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId,
      });

      res.status(201).json({
        success: true,
        message: 'DLP policy created successfully',
        data: { id: policyData.name.toLowerCase().replace(/\s+/g, '-') },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const err = error as Error;
      logger.error('Failed to create DLP policy', {
        component: 'DLPRoutes',
        error: err.message,
        userId: (req as any).user?.id,
      });
      throw new AppError('Failed to create DLP policy', 500);
    }
  },
);

/**
 * PUT /api/dlp/policies/:id
 * Update an existing DLP policy
 */
router.put(
  '/policies/:id',
  rbacMiddleware(['admin']),
  param('id').isString().notEmpty(),
  body('name').isString().optional().isLength({ min: 1, max: 100 }),
  body('description').isString().optional().isLength({ max: 500 }),
  body('enabled').isBoolean().optional(),
  body('priority').isInt({ min: 1, max: 100 }).optional(),
  body('conditions').isArray().optional(),
  body('actions').isArray().optional(),
  body('exemptions').isArray().optional(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          errors: errors.array(),
        });
      }

      const policyId = req.params.id;
      const updates = { ...req.body, updatedAt: new Date() };

      if (!dlpService.getPolicy(policyId)) {
        throw new AppError('DLP policy not found', 404);
      }

      // Validate updated policy structure if conditions/actions provided
      if (updates.conditions || updates.actions) {
        const existingPolicy = dlpService.getPolicy(policyId)!;
        const updatedPolicy = { ...existingPolicy, ...updates };
        validatePolicyStructure(updatedPolicy);
      }

      const success = dlpService.updatePolicy(policyId, updates);
      if (!success) {
        throw new AppError('Failed to update DLP policy', 500);
      }

      logger.info('DLP policy updated', {
        component: 'DLPRoutes',
        policyId,
        updatedBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId,
        changes: Object.keys(updates),
      });

      res.json({
        success: true,
        message: 'DLP policy updated successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const err = error as Error;
      logger.error('Failed to update DLP policy', {
        component: 'DLPRoutes',
        error: err.message,
        policyId: req.params.id,
        userId: (req as any).user?.id,
      });
      throw new AppError('Failed to update DLP policy', 500);
    }
  },
);

/**
 * DELETE /api/dlp/policies/:id
 * Delete a DLP policy
 */
router.delete(
  '/policies/:id',
  rbacMiddleware(['admin']),
  param('id').isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid policy ID', 400, 'VALIDATION_ERROR');
      }

      const policyId = req.params.id;

      if (!dlpService.getPolicy(policyId)) {
        throw new AppError('DLP policy not found', 404);
      }

      const success = dlpService.deletePolicy(policyId);
      if (!success) {
        throw new AppError('Failed to delete DLP policy', 500);
      }

      logger.info('DLP policy deleted', {
        component: 'DLPRoutes',
        policyId,
        deletedBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId,
      });

      res.json({
        success: true,
        message: 'DLP policy deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const err = error as Error;
      logger.error('Failed to delete DLP policy', {
        component: 'DLPRoutes',
        error: err.message,
        policyId: req.params.id,
        userId: (req as any).user?.id,
      });
      throw new AppError('Failed to delete DLP policy', 500);
    }
  },
);

/**
 * POST /api/dlp/policies/:id/toggle
 * Toggle a DLP policy enabled/disabled state
 */
router.post(
  '/policies/:id/toggle',
  rbacMiddleware(['admin', 'security_officer']),
  param('id').isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid policy ID', 400, 'VALIDATION_ERROR');
      }

      const policyId = req.params.id;
      const policy = dlpService.getPolicy(policyId);

      if (!policy) {
        throw new AppError('DLP policy not found', 404);
      }

      const success = dlpService.updatePolicy(policyId, {
        enabled: !policy.enabled,
        updatedAt: new Date(),
      });

      if (!success) {
        throw new AppError('Failed to toggle DLP policy', 500);
      }

      logger.info('DLP policy toggled', {
        component: 'DLPRoutes',
        policyId,
        newState: !policy.enabled,
        toggledBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId,
      });

      res.json({
        success: true,
        message: `DLP policy ${!policy.enabled ? 'enabled' : 'disabled'} successfully`,
        data: { enabled: !policy.enabled },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const err = error as Error;
      logger.error('Failed to toggle DLP policy', {
        component: 'DLPRoutes',
        error: err.message,
        policyId: req.params.id,
        userId: (req as any).user?.id,
      });
      throw new AppError('Failed to toggle DLP policy', 500);
    }
  },
);

/**
 * POST /api/dlp/scan
 * Manual content scanning endpoint
 */
router.post(
  '/scan',
  rbacMiddleware(['admin', 'security_officer', 'analyst']),
  body('content').notEmpty(),
  body('operationType')
    .isIn(['read', 'write', 'delete', 'export', 'share'])
    .optional(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          errors: errors.array(),
        });
      }

      const context = {
        userId: (req as any).user?.id || 'anonymous',
        tenantId: (req as any).user?.tenantId || 'default',
        userRole: (req as any).user?.role || 'user',
        operationType: req.body.operationType || ('read' as const),
        contentType: 'manual-scan',
        metadata: {
          scanType: 'manual',
          requestedBy: (req as any).user?.id,
        },
      };

      const scanResults = await dlpService.scanContent(
        req.body.content,
        context,
      );

      const response = {
        success: true,
        data: {
          violations: scanResults.map((result) => ({
            policyId: result.policyId,
            matched: result.matched,
            confidence: result.confidence,
            detectedEntities: result.metadata.detectedEntities,
            recommendedActions: result.recommendedActions.map((action) => ({
              type: action.type,
              severity: action.severity,
            })),
            scanDuration: result.metadata.scanDuration,
          })),
          summary: {
            totalViolations: scanResults.length,
            highSeverityViolations: scanResults.filter((r) =>
              r.recommendedActions.some(
                (a) => a.severity === 'high' || a.severity === 'critical',
              ),
            ).length,
            wouldBlock: scanResults.some((r) =>
              r.recommendedActions.some((a) => a.type === 'block'),
            ),
          },
        },
      };

      logger.info('Manual DLP scan completed', {
        component: 'DLPRoutes',
        userId: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId,
        violationCount: scanResults.length,
        contentSize: JSON.stringify(req.body.content).length,
      });

      res.json(response);
    } catch (error) {
      const err = error as Error;
      logger.error('Manual DLP scan failed', {
        component: 'DLPRoutes',
        error: err.message,
        userId: (req as any).user?.id,
      });
      throw new AppError('DLP scan failed', 500);
    }
  },
);

/**
 * GET /api/dlp/metrics
 * Get DLP metrics and statistics
 */
router.get(
  '/metrics',
  rbacMiddleware(['admin', 'security_officer']),
  query('timeRange').isIn(['1h', '24h', '7d', '30d']).optional(),
  async (req: Request, res: Response) => {
    try {
      const timeRange = (req.query.timeRange as string) || '24h';

      // In a real implementation, this would query metrics from a time-series database
      const mockMetrics = {
        timeRange,
        totalScans: 1250,
        violations: {
          total: 45,
          blocked: 12,
          redacted: 28,
          quarantined: 5,
        },
        topViolatedPolicies: [
          { policyId: 'pii-detection', violations: 18, name: 'PII Detection' },
          {
            policyId: 'credentials-detection',
            violations: 12,
            name: 'Credentials Detection',
          },
          {
            policyId: 'financial-data',
            violations: 8,
            name: 'Financial Data Protection',
          },
        ],
        violationsByType: {
          email: 15,
          ssn: 8,
          creditCard: 6,
          apiKey: 12,
          phone: 4,
        },
        trends: {
          daily: [2, 5, 3, 8, 12, 6, 9], // Last 7 days
          hourly: Array.from({ length: 24 }, () =>
            Math.floor(Math.random() * 5),
          ),
        },
      };

      res.json({
        success: true,
        data: mockMetrics,
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get DLP metrics', {
        component: 'DLPRoutes',
        error: err.message,
        userId: (req as any).user?.id,
      });
      throw new AppError('Failed to retrieve DLP metrics', 500);
    }
  },
);

/**
 * Helper function to validate policy structure
 */
function validatePolicyStructure(policy: Partial<DLPPolicy>): void {
  // Validate conditions
  if (policy.conditions) {
    for (const condition of policy.conditions) {
      if (
        !condition.type ||
        !condition.operator ||
        condition.value === undefined
      ) {
        throw new AppError('Invalid policy condition structure', 400);
      }

      const validTypes = [
        'content_match',
        'field_match',
        'metadata_match',
        'user_role',
        'tenant_id',
      ];
      if (!validTypes.includes(condition.type)) {
        throw new AppError(`Invalid condition type: ${condition.type}`, 400);
      }

      const validOperators = [
        'contains',
        'matches',
        'equals',
        'starts_with',
        'ends_with',
      ];
      if (!validOperators.includes(condition.operator)) {
        throw new AppError(
          `Invalid condition operator: ${condition.operator}`,
          400,
        );
      }
    }
  }

  // Validate actions
  if (policy.actions) {
    for (const action of policy.actions) {
      if (!action.type || !action.severity) {
        throw new AppError('Invalid policy action structure', 400);
      }

      const validActionTypes = [
        'block',
        'redact',
        'quarantine',
        'alert',
        'audit',
        'encrypt',
      ];
      if (!validActionTypes.includes(action.type)) {
        throw new AppError(`Invalid action type: ${action.type}`, 400);
      }

      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(action.severity)) {
        throw new AppError(`Invalid action severity: ${action.severity}`, 400);
      }
    }
  }
}

export default router;
