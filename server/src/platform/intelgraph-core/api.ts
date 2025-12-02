import express from 'express';
import { GraphBackend } from './backend.js';

export class IntelGraphAPI {
  public router = express.Router();

  constructor(private backend: GraphBackend) {
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.get('/tenants/:tenantId/nodes', async (req, res) => {
      // Security check: Verify tenant isolation
      // Assuming req.user is populated by upstream auth middleware
      const userTenantId = (req as any).user?.tenantId;
      const requestedTenantId = req.params.tenantId;

      if (!userTenantId || userTenantId !== requestedTenantId) {
        res.status(403).json({ error: 'Access denied: Tenant mismatch' });
        return;
      }

      const { type } = req.query;
      try {
        const nodes = await this.backend.queryNodes(requestedTenantId, type as string);
        res.json(nodes);
      } catch (e) {
        res.status(500).json({ error: (e as Error).message });
      }
    });

    this.router.post('/nodes', async (req, res) => {
      // Internal use or high-privilege only - strictly check tenant
      const userTenantId = (req as any).user?.tenantId;
      if (!userTenantId) {
         res.status(401).json({ error: 'Unauthorized' });
         return;
      }

      const bodyTenantId = req.body.tenantId;
      if (bodyTenantId && bodyTenantId !== userTenantId) {
        res.status(403).json({ error: 'Access denied: Cannot create nodes for other tenants' });
        return;
      }

      try {
        const node = await this.backend.createNode({
            ...req.body,
            tenantId: userTenantId // Force tenantId from auth context
        });
        res.status(201).json(node);
      } catch (e) {
         res.status(500).json({ error: (e as Error).message });
      }
    });
  }
}
