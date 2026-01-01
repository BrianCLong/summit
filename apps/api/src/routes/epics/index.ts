import { Router, type Request, type Response } from 'express';

import { EpicService } from '../../services/EpicService.js';
import { EpicUpdatePayload } from '../../contracts/epics.js';
import { RBACManager } from '../../../../../packages/authentication/src/rbac/rbac-manager.js';
import { requirePermission } from '../../middleware/security.js';

export interface EpicsRouterDeps {
  epicService: EpicService;
  rbacManager: RBACManager;
}

function validateStatus(status: unknown): status is EpicUpdatePayload['status'] {
  return (
    status === 'not_started' ||
    status === 'in_progress' ||
    status === 'completed' ||
    status === 'blocked'
  );
}

export function createEpicsRouter({ epicService, rbacManager }: EpicsRouterDeps): Router {
  const router = Router();

  router.get('/', requirePermission(rbacManager, 'epics', 'read'), (_req: Request, res: Response) => {
    return res.json({ epics: epicService.list() });
  });

  router.get('/:id', requirePermission(rbacManager, 'epics', 'read'), (req: Request, res: Response) => {
    const epic = epicService.get(req.params.id);
    if (!epic) {
      return res.status(404).json({ error: 'epic_not_found' });
    }
    return res.json(epic);
  });

  router.post(
    '/:id/tasks/:taskId/status',
    requirePermission(rbacManager, 'epics', 'update'),
    (req: Request, res: Response) => {
      const { status, note, owner } = req.body as Partial<EpicUpdatePayload>;
      if (!validateStatus(status)) {
        return res.status(400).json({
          error: 'invalid_status',
          allowed: ['not_started', 'in_progress', 'completed', 'blocked'],
        });
      }

      try {
        const updated = epicService.updateTask(req.params.id, req.params.taskId, {
          status,
          note,
          owner,
        });
        return res.json(updated);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(404).json({ error: 'task_not_found', message });
      }
    },
  );

  return router;
}
