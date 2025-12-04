import { Router } from 'express';
import { Maestro } from '../maestro/core';

export function buildMaestroRouter(maestro: Maestro): Router {
  const router = Router();

  router.post('/runs', async (req, res, next) => {
    try {
      const { userId, requestText } = req.body;
      const result = await maestro.runPipeline(userId, requestText);
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
