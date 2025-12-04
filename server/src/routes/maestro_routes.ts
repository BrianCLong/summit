import { Router } from 'express';
import { Maestro } from '../maestro/core.js';
import { MaestroQueries } from '../maestro/queries.js';

export function buildMaestroRouter(
  maestro: Maestro,
  queries: MaestroQueries,
): Router {
  const router = Router();

  // POST /api/maestro/runs – fire-and-return (current v0.1)
  router.post('/runs', async (req, res, next) => {
    try {
      const { userId, requestText } = req.body ?? {};
      if (!userId || !requestText) {
        return res.status(400).json({
          error: 'Missing userId or requestText',
        });
      }

      const result = await maestro.runPipeline(userId, requestText);
      return res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/maestro/runs/:runId – reconstruct current state (for polling)
  router.get('/runs/:runId', async (req, res, next) => {
    try {
      const { runId } = req.params;
      const response = await queries.getRunResponse(runId);
      if (!response) {
        return res.status(404).json({ error: 'Run not found' });
      }
      return res.json(response);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/maestro/runs/:runId/tasks – list tasks only
  router.get('/runs/:runId/tasks', async (req, res, next) => {
    try {
      const { runId } = req.params;
      const run = await queries.getRunResponse(runId);
      if (!run) return res.status(404).json({ error: 'Run not found' });
      return res.json(run.tasks);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/maestro/tasks/:taskId – detailed task + artifacts
  router.get('/tasks/:taskId', async (req, res, next) => {
    try {
      const { taskId } = req.params;
      const result = await queries.getTaskWithArtifacts(taskId);
      if (!result) return res.status(404).json({ error: 'Task not found' });
      return res.json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
