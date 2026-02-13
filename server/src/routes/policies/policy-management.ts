/**
 * Policy Management Routes
 *
 * REST API endpoints for governance policy CRUD, versioning,
 * simulation, and approval workflows.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module routes/policies/policy-management
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import {
  PolicyManagementService,
  createPolicySchema,
  updatePolicySchema,
} from '../../services/PolicyManagementService.js';
import {
  PolicySimulatorService,
  simulationRequestSchema,
} from '../../services/PolicySimulatorService.js';
import { Principal, Action } from '../../types/identity.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();
const policyService = new PolicyManagementService();
const simulatorService = new PolicySimulatorService();

// ============================================================================
// Middleware
// ============================================================================

/**
 * Build Principal from request user
 */
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

/**
 * Require policy management permission
 */
const requirePolicyPermission = (action: Action) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const principal = (req as any).principal;
      await authz.assertCan(principal, action, { type: 'policy', tenantId: principal.tenantId });
      next();
    } catch (error: any) {
      if (error.message.includes('Permission denied')) {
        res.status(403).json({
          error: 'Forbidden',
          code: 'PERMISSION_DENIED',
          required: `policy:${action}`,
        });
        return;
      }
      logger.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization service error' });
    }
  };
};

// ============================================================================
// Policy CRUD Routes
// ============================================================================

/**
 * GET /policies
 * List policies with pagination and filtering
 */
router.get(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { page, pageSize, status, category, search } = req.query as any;

      const envelope = await policyService.listPolicies(
        principal.tenantId,
        {
          page: page ? parseInt(page as string, 10) : undefined,
          pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
          status: status as any,
          category: category as any,
          search: search as string,
        },
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing policies:', error);
      res.status(500).json({ error: 'Failed to list policies', message: error.message });
    }
  }
);

/**
 * GET /policies/:id
 * Get a specific policy
 */
router.get(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await policyService.getPolicy(principal.tenantId, id, principal.id);

      if (!envelope.data) {
        res.status(404).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting policy:', error);
      res.status(500).json({ error: 'Failed to get policy', message: error.message });
    }
  }
);

/**
 * POST /policies
 * Create a new policy
 */
router.post(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const parseResult = createPolicySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
        return;
      }

      const envelope = await policyService.createPolicy(
        principal.tenantId,
        parseResult.data,
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.status(201).json(envelope);
    } catch (error: any) {
      logger.error('Error creating policy:', error);
      res.status(500).json({ error: 'Failed to create policy', message: error.message });
    }
  }
);

/**
 * PATCH /policies/:id
 * Update a policy
 */
router.patch(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('update'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { changelog, ...updates } = req.body;

      const parseResult = updatePolicySchema.safeParse(updates);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
        return;
      }

      const envelope = await policyService.updatePolicy(
        principal.tenantId,
        id,
        parseResult.data,
        changelog || 'Policy updated',
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error updating policy:', error);
      res.status(500).json({ error: 'Failed to update policy', message: error.message });
    }
  }
);

/**
 * DELETE /policies/:id
 * Archive a policy
 */
router.delete(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('delete'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await policyService.deletePolicy(principal.tenantId, id, principal.id);

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error deleting policy:', error);
      res.status(500).json({ error: 'Failed to delete policy', message: error.message });
    }
  }
);

// ============================================================================
// Version Management Routes
// ============================================================================

/**
 * GET /policies/:id/versions
 * List versions of a policy
 */
router.get(
  '/:id/versions',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await policyService.listPolicyVersions(
        principal.tenantId,
        id,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing policy versions:', error);
      res.status(500).json({ error: 'Failed to list versions', message: error.message });
    }
  }
);

/**
 * POST /policies/:id/rollback
 * Rollback to a previous version
 */
router.post(
  '/:id/rollback',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('update'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { targetVersion } = req.body;

      if (!targetVersion || typeof targetVersion !== 'number') {
        res.status(400).json({ error: 'targetVersion is required and must be a number' });
        return;
      }

      const envelope = await policyService.rollbackPolicy(
        principal.tenantId,
        id,
        targetVersion,
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error rolling back policy:', error);
      res.status(500).json({ error: 'Failed to rollback policy', message: error.message });
    }
  }
);

// ============================================================================
// Approval Workflow Routes
// ============================================================================

/**
 * POST /policies/:id/submit
 * Submit policy for approval
 */
router.post(
  '/:id/submit',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('submit'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { reason } = req.body;

      const envelope = await policyService.submitForApproval(
        principal.tenantId,
        id,
        reason || 'Submitted for review',
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error submitting policy:', error);
      res.status(500).json({ error: 'Failed to submit policy', message: error.message });
    }
  }
);

/**
 * POST /policies/:id/approve
 * Approve a policy
 */
router.post(
  '/:id/approve',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('approve'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;
      const { notes } = req.body;

      const envelope = await policyService.approvePolicy(
        principal.tenantId,
        id,
        notes || '',
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error approving policy:', error);
      res.status(500).json({ error: 'Failed to approve policy', message: error.message });
    }
  }
);

/**
 * POST /policies/:id/publish
 * Publish an approved policy
 */
router.post(
  '/:id/publish',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('publish'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { id } = req.params;

      const envelope = await policyService.publishPolicy(
        principal.tenantId,
        id,
        principal.id
      );

      if (!envelope.data.success) {
        res.status(400).json(envelope);
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error publishing policy:', error);
      res.status(500).json({ error: 'Failed to publish policy', message: error.message });
    }
  }
);

// ============================================================================
// Simulation Routes
// ============================================================================

/**
 * POST /policies/simulate
 * Simulate a policy against a context
 */
router.post(
  '/simulate',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('simulate'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;

      const parseResult = simulationRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
        return;
      }

      const envelope = await simulatorService.simulate(parseResult.data, principal.id);

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error simulating policy:', error);
      res.status(500).json({ error: 'Failed to simulate policy', message: error.message });
    }
  }
);

/**
 * POST /policies/simulate/batch
 * Simulate a policy against multiple contexts
 */
router.post(
  '/simulate/batch',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('simulate'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { policy, contexts } = req.body;

      if (!policy || !contexts || !Array.isArray(contexts)) {
        res.status(400).json({
          error: 'policy and contexts array are required',
        });
        return;
      }

      const envelope = await simulatorService.batchSimulate(
        { policy, contexts },
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error in batch simulation:', error);
      res.status(500).json({ error: 'Failed to batch simulate', message: error.message });
    }
  }
);

/**
 * POST /policies/analyze-impact
 * Analyze the impact of a policy change
 */
router.post(
  '/analyze-impact',
  ensureAuthenticated,
  buildPrincipal,
  requirePolicyPermission('simulate'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { currentPolicy, newPolicy } = req.body;

      if (!currentPolicy || !newPolicy) {
        res.status(400).json({
          error: 'currentPolicy and newPolicy are required',
        });
        return;
      }

      const envelope = await simulatorService.analyzeImpact(
        currentPolicy,
        newPolicy,
        principal.id
      );

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error analyzing impact:', error);
      res.status(500).json({ error: 'Failed to analyze impact', message: error.message });
    }
  }
);

export default router;
