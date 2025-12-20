import { Router } from 'express';
import type { ContainerOrchestrator } from '@intelgraph/edge-runtime';

export function createDeploymentRoutes(orchestrator: ContainerOrchestrator): Router {
  const router = Router();

  // Deploy a container
  router.post('/', async (req, res) => {
    try {
      const options = req.body;

      const containerId = await orchestrator.deployContainer(options);

      res.status(201).json({ containerId });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to deploy container',
        message: (error as Error).message
      });
    }
  });

  // List containers
  router.get('/', async (req, res) => {
    try {
      const { all } = req.query;

      const containers = await orchestrator.listContainers(all === 'true');

      res.json({ containers, total: containers.length });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list containers',
        message: (error as Error).message
      });
    }
  });

  // Get container info
  router.get('/:containerId', async (req, res) => {
    try {
      const info = await orchestrator.getContainerInfo(req.params.containerId);

      res.json(info);
    } catch (error) {
      res.status(404).json({
        error: 'Container not found',
        message: (error as Error).message
      });
    }
  });

  // Start container
  router.post('/:containerId/start', async (req, res) => {
    try {
      await orchestrator.startContainer(req.params.containerId);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to start container',
        message: (error as Error).message
      });
    }
  });

  // Stop container
  router.post('/:containerId/stop', async (req, res) => {
    try {
      const { timeout } = req.body;

      await orchestrator.stopContainer(req.params.containerId, timeout);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to stop container',
        message: (error as Error).message
      });
    }
  });

  // Restart container
  router.post('/:containerId/restart', async (req, res) => {
    try {
      const { timeout } = req.body;

      await orchestrator.restartContainer(req.params.containerId, timeout);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to restart container',
        message: (error as Error).message
      });
    }
  });

  // Remove container
  router.delete('/:containerId', async (req, res) => {
    try {
      const { force } = req.query;

      await orchestrator.removeContainer(req.params.containerId, force === 'true');

      res.status(204).send();
    } catch (error) {
      res.status(400).json({
        error: 'Failed to remove container',
        message: (error as Error).message
      });
    }
  });

  // Get container logs
  router.get('/:containerId/logs', async (req, res) => {
    try {
      const { tail, since, timestamps } = req.query;

      const logs = await orchestrator.getContainerLogs(req.params.containerId, {
        tail: tail ? parseInt(tail as string) : undefined,
        since: since ? parseInt(since as string) : undefined,
        timestamps: timestamps === 'true'
      });

      res.type('text/plain').send(logs);
    } catch (error) {
      res.status(400).json({
        error: 'Failed to get container logs',
        message: (error as Error).message
      });
    }
  });

  // Get container stats
  router.get('/:containerId/stats', async (req, res) => {
    try {
      const stats = await orchestrator.getContainerStats(req.params.containerId);

      res.json(stats);
    } catch (error) {
      res.status(400).json({
        error: 'Failed to get container stats',
        message: (error as Error).message
      });
    }
  });

  // Execute command in container
  router.post('/:containerId/exec', async (req, res) => {
    try {
      const { cmd, env, workingDir } = req.body;

      const result = await orchestrator.execInContainer(req.params.containerId, cmd, {
        env,
        workingDir
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: 'Failed to execute command',
        message: (error as Error).message
      });
    }
  });

  return router;
}
