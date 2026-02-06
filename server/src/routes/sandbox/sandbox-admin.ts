/**
 * Sandbox Admin Routes
 *
 * REST API endpoints for sandbox testing environment.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC8.1 (Change Management)
 *
 * @module routes/sandbox/sandbox-admin
 */

import express, { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { sandboxManager } from '../../sandbox/SandboxManager.js';
import { Principal } from '../../types/identity.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const authz = new AuthorizationServiceImpl();
const singleParam = (value: unknown): string | undefined =>
  Array.isArray(value) ? (value[0] as string | undefined) : typeof value === 'string' ? value : undefined;

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

const requireSandboxAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'execute', { type: 'sandbox', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'sandbox:execute',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

const requireSandboxAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const principal = (req as any).principal;
    await authz.assertCan(principal, 'administer', { type: 'sandbox', tenantId: principal.tenantId });
    next();
  } catch (error: any) {
    if (error.message.includes('Permission denied')) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: 'sandbox:administer',
      });
      return;
    }
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization service error' });
  }
};

// ============================================================================
// Sandbox CRUD Routes
// ============================================================================

/**
 * POST /sandbox
 * Create a new sandbox environment
 */
router.post(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const { name, policies, scenarios, personas, limits, expiresIn } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Sandbox name is required' });
        return;
      }

      const envelope = await sandboxManager.create({
        name,
        tenantId: principal.tenantId,
        createdBy: principal.id,
        policies,
        scenarios,
        personas,
        limits,
        expiresIn,
      });

      res.status(201).json(envelope);
    } catch (error: any) {
      logger.error('Error creating sandbox:', error);
      res.status(500).json({ error: 'Failed to create sandbox', message: error.message });
    }
  }
);

/**
 * GET /sandbox
 * List all sandboxes for the tenant
 */
router.get(
  '/',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const principal = (req as any).principal;
      const envelope = sandboxManager.listSandboxes(principal.tenantId);
      res.json(envelope);
    } catch (error: any) {
      logger.error('Error listing sandboxes:', error);
      res.status(500).json({ error: 'Failed to list sandboxes', message: error.message });
    }
  }
);

/**
 * GET /sandbox/:id
 * Get sandbox details
 */
router.get(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = singleParam(req.params.id) ?? '';
      const envelope = sandboxManager.getSandbox(id);

      if (!envelope.data) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting sandbox:', error);
      res.status(500).json({ error: 'Failed to get sandbox', message: error.message });
    }
  }
);

/**
 * PUT /sandbox/:id
 * Update sandbox configuration
 */
router.put(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = singleParam(req.params.id) ?? '';
      const { name, policies, testData, limits } = req.body;

      const envelope = await sandboxManager.updateSandbox(id, {
        name,
        policies,
        testData,
        limits,
      });

      if (!envelope.data) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error updating sandbox:', error);
      res.status(500).json({ error: 'Failed to update sandbox', message: error.message });
    }
  }
);

/**
 * DELETE /sandbox/:id
 * Delete a sandbox
 */
router.delete(
  '/:id',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = singleParam(req.params.id) ?? '';
      const envelope = sandboxManager.deleteSandbox(id);

      if (!envelope.data.deleted) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error deleting sandbox:', error);
      res.status(500).json({ error: 'Failed to delete sandbox', message: error.message });
    }
  }
);

// ============================================================================
// Scenario Routes
// ============================================================================

/**
 * POST /sandbox/:id/scenarios
 * Add a scenario to the sandbox
 */
router.post(
  '/:id/scenarios',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = singleParam(req.params.id) ?? '';
      const { name, description, actor, action, resource, context, expectedVerdict } = req.body;

      if (!name || !actor || !action || !resource) {
        res.status(400).json({
          error: 'name, actor, action, and resource are required',
        });
        return;
      }

      const envelope = sandboxManager.addScenario(id, {
        name,
        description,
        actor,
        action,
        resource,
        context,
        expectedVerdict,
      });

      res.status(201).json(envelope);
    } catch (error: any) {
      logger.error('Error adding scenario:', error);
      res.status(500).json({ error: 'Failed to add scenario', message: error.message });
    }
  }
);

// ============================================================================
// Execution Routes
// ============================================================================

/**
 * POST /sandbox/:id/execute
 * Execute sandbox scenarios
 */
router.post(
  '/:id/execute',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = singleParam(req.params.id) ?? '';
      const { scenarioId, policyId, contextOverrides } = req.body;

      const envelope = await sandboxManager.execute({
        sandboxId: id,
        scenarioId,
        policyId,
        contextOverrides,
      });

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error executing sandbox:', error);
      res.status(500).json({ error: 'Failed to execute sandbox', message: error.message });
    }
  }
);

/**
 * GET /sandbox/executions/:executionId
 * Get execution result
 */
router.get(
  '/executions/:executionId',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const executionId = singleParam(req.params.executionId) ?? '';
      const envelope = sandboxManager.getExecution(executionId);

      if (!envelope.data) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }

      res.json(envelope);
    } catch (error: any) {
      logger.error('Error getting execution:', error);
      res.status(500).json({ error: 'Failed to get execution', message: error.message });
    }
  }
);

// ============================================================================
// Policy Cloning Routes
// ============================================================================

/**
 * POST /sandbox/:id/clone-policy
 * Clone a production policy into the sandbox
 */
router.post(
  '/:id/clone-policy',
  ensureAuthenticated,
  buildPrincipal,
  requireSandboxAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = singleParam(req.params.id) ?? '';
      const { policyId, policyData } = req.body;

      if (!policyData) {
        res.status(400).json({ error: 'policyData is required' });
        return;
      }

      const sandbox = sandboxManager.getSandbox(id);
      if (!sandbox.data) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
      }

      // Clone policy with new ID
      const clonedPolicy = {
        id: `sandbox-policy-${Date.now()}`,
        originalId: policyId,
        name: policyData.name,
        description: policyData.description,
        rules: policyData.rules || [],
        status: 'draft' as const,
        modifiedInSandbox: false,
      };

      const updated = await sandboxManager.updateSandbox(id, {
        policies: [...sandbox.data.policies, clonedPolicy],
      });

      res.status(201).json(updated);
    } catch (error: any) {
      logger.error('Error cloning policy:', error);
      res.status(500).json({ error: 'Failed to clone policy', message: error.message });
    }
  }
);

export default router;
