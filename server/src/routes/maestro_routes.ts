import { Router } from 'express';
import { Maestro } from '../maestro/core.js';
import { MaestroQueries } from '../maestro/queries.js';

export function buildMaestroRouter(
  maestro: Maestro,
  queries: MaestroQueries,
): Router {
  const router = Router();

  /**
   * @openapi
   * /maestro/runs:
   *   post:
   *     tags:
   *       - Maestro
   *     summary: Run a pipeline (Fire-and-forget)
   *     description: Initiates a pipeline run based on a natural language request.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - requestText
   *             properties:
   *               userId:
   *                 type: string
   *               requestText:
   *                 type: string
   *     responses:
   *       200:
   *         description: Pipeline started
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 runId:
   *                   type: string
   *       400:
   *         description: Missing parameters
   */
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

  /**
   * @openapi
   * /maestro/runs/{runId}:
   *   get:
   *     tags:
   *       - Maestro
   *     summary: Get run state
   *     description: Retrieves the current state of a run.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: runId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Run details
   *       404:
   *         description: Run not found
   */
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

  /**
   * @openapi
   * /maestro/runs/{runId}/tasks:
   *   get:
   *     tags:
   *       - Maestro
   *     summary: List run tasks
   *     description: Retrieves tasks associated with a run.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: runId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of tasks
   *       404:
   *         description: Run not found
   */
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

  /**
   * @openapi
   * /maestro/tasks/{taskId}:
   *   get:
   *     tags:
   *       - Maestro
   *     summary: Get task details
   *     description: Retrieves detailed information about a task.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Task details
   *       404:
   *         description: Task not found
   */
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
