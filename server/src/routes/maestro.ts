import { Router } from 'express';
import { Maestro } from '../maestro/core';
import { unifiedAuthMiddleware, requireAuth } from '../middleware/unifiedAuth.js';
import { assertCan } from '../auth/authorization.js';

export function buildMaestroRouter(maestro: Maestro): Router {
  const router = Router();

  // unifiedAuthMiddleware is already applied globally in app.ts
  // We only need to ensure authentication is required for this router
  router.use(requireAuth);

  router.post('/runs', async (req, res, next) => {
    try {
      const principal = req.principal!;

      // Authorization Check
      assertCan('runs.write', {
        principal,
        resourceTenantId: principal.tenantId
      });

      const { requestText } = req.body;

      // Pass tenant context to Maestro (assumes Maestro updated to handle tenantId)
      // Note: We use principal.id (the authenticated user) instead of req.body.userId
      const result = await maestro.runPipeline(
        principal.id,
        requestText,
        { tenantId: principal.tenantId }
      );

      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // Optionally:
  // GET /runs/:runId
  // GET /runs/:runId/tasks
  // GET /tasks/:taskId
  // etc.

  return router;
}
