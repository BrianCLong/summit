import { Router } from 'express';
import { Maestro } from '../maestro/core';
import { createApproval } from '../services/approvals.js';

const isHighRiskRun = (body: any): boolean =>
  body?.riskLevel === 'high' ||
  body?.requiresApproval === true ||
  body?.externalEffects === true ||
  body?.externalSideEffects === true;

export function buildMaestroRouter(maestro: Maestro): Router {
  const router = Router();

  router.post('/runs', async (req, res, next) => {
    try {
      const { userId, requestText } = req.body;
      const requesterId = (req as any).user?.sub || (req as any).user?.id || userId;

      if (!requesterId || !requestText) {
        return res
          .status(400)
          .json({ error: 'userId and requestText are required for Maestro runs' });
      }

      if (isHighRiskRun(req.body)) {
        const approval = await createApproval({
          requesterId,
          action: 'maestro_run',
          payload: {
            userId: requesterId,
            requestText,
            externalEffects: req.body.externalEffects ?? req.body.externalSideEffects,
          },
          reason:
            req.body.reason ||
            'Maestro run flagged for human review due to external side effects',
        });

        return res.status(202).json({ status: 'pending_approval', approval });
      }

      const result = await maestro.runPipeline(requesterId, requestText);
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
