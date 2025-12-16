/**
 * Example Routes
 * Demonstrates pattern for implementing API endpoints
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const exampleRoutes = Router();

interface ExampleResource {
  id: string;
  name: string;
  createdAt: string;
  tenantId: string;
}

// In-memory store for demo
const resources: Map<string, ExampleResource> = new Map();

/**
 * List resources
 * Protected by OPA - requires 'resource:list' permission
 */
exampleRoutes.get(
  '/resources',
  requirePermission('resource:list'),
  async (req: Request, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;

    // Filter by tenant
    const tenantResources = Array.from(resources.values()).filter(
      (r) => r.tenantId === tenantId
    );

    logger.info('Listed resources', {
      tenantId,
      count: tenantResources.length,
    });

    res.json({
      data: tenantResources,
      count: tenantResources.length,
    });
  }
);

/**
 * Get single resource
 * Protected by OPA - requires 'resource:read' permission
 */
exampleRoutes.get(
  '/resources/:id',
  requirePermission('resource:read'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantContext?.tenantId;

    const resource = resources.get(id);

    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    // Tenant isolation check
    if (resource.tenantId !== tenantId) {
      logger.warn('Cross-tenant access attempt', {
        requestedTenant: resource.tenantId,
        userTenant: tenantId,
      });
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    res.json({ data: resource });
  }
);

/**
 * Create resource
 * Protected by OPA - requires 'resource:create' permission
 */
exampleRoutes.post(
  '/resources',
  requirePermission('resource:create'),
  async (req: Request, res: Response) => {
    const { name } = req.body;
    const tenantId = req.tenantContext?.tenantId;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const resource: ExampleResource = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      tenantId: tenantId!,
    };

    resources.set(resource.id, resource);

    logger.info('Created resource', {
      resourceId: resource.id,
      tenantId,
    });

    res.status(201).json({ data: resource });
  }
);

/**
 * Update resource
 * Protected by OPA - requires 'resource:update' permission
 */
exampleRoutes.put(
  '/resources/:id',
  requirePermission('resource:update'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    const tenantId = req.tenantContext?.tenantId;

    const resource = resources.get(id);

    if (!resource || resource.tenantId !== tenantId) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    resource.name = name || resource.name;
    resources.set(id, resource);

    logger.info('Updated resource', { resourceId: id, tenantId });

    res.json({ data: resource });
  }
);

/**
 * Delete resource
 * Protected by OPA - requires 'resource:delete' permission
 */
exampleRoutes.delete(
  '/resources/:id',
  requirePermission('resource:delete'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantContext?.tenantId;

    const resource = resources.get(id);

    if (!resource || resource.tenantId !== tenantId) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    resources.delete(id);

    logger.info('Deleted resource', { resourceId: id, tenantId });

    res.status(204).send();
  }
);
