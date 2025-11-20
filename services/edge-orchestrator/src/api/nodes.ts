import { Router } from 'express';
import type { EdgeNodeManager } from '@intelgraph/edge-computing';

export function createNodeRoutes(nodeManager: EdgeNodeManager): Router {
  const router = Router();

  // Register a new edge node
  router.post('/register', async (req, res) => {
    try {
      const { metadata, config } = req.body;

      const result = await nodeManager.registerNode(metadata, config);

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        error: 'Failed to register node',
        message: (error as Error).message
      });
    }
  });

  // Deregister an edge node
  router.delete('/:nodeId', async (req, res) => {
    try {
      await nodeManager.deregisterNode(req.params.nodeId);

      res.status(204).send();
    } catch (error) {
      res.status(400).json({
        error: 'Failed to deregister node',
        message: (error as Error).message
      });
    }
  });

  // Update node heartbeat
  router.post('/:nodeId/heartbeat', async (req, res) => {
    try {
      const { capacity } = req.body;

      await nodeManager.updateHeartbeat(req.params.nodeId, capacity);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to update heartbeat',
        message: (error as Error).message
      });
    }
  });

  // Get node details
  router.get('/:nodeId', (req, res) => {
    const node = nodeManager.getNode(req.params.nodeId);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(node);
  });

  // List all nodes
  router.get('/', (req, res) => {
    const { status, clusterId } = req.query;

    let nodes = nodeManager.getAllNodes();

    if (status) {
      nodes = nodes.filter(n => n.status === status);
    }

    if (clusterId) {
      nodes = nodes.filter(n => n.clusterId === clusterId);
    }

    res.json({ nodes, total: nodes.length });
  });

  // Get healthy nodes
  router.get('/healthy/list', (req, res) => {
    const nodes = nodeManager.getHealthyNodes();

    res.json({ nodes, total: nodes.length });
  });

  // Find nearest nodes
  router.post('/nearest', (req, res) => {
    const { latitude, longitude, limit } = req.body;

    const nodes = nodeManager.findNearestNodes({ latitude, longitude }, limit || 5);

    res.json({ nodes });
  });

  // Get cluster statistics
  router.get('/cluster/stats', (req, res) => {
    const { clusterId } = req.query;

    const stats = nodeManager.getClusterStats(clusterId as string | undefined);

    res.json(stats);
  });

  // Set maintenance mode
  router.post('/:nodeId/maintenance', async (req, res) => {
    try {
      const { enabled } = req.body;

      await nodeManager.setMaintenanceMode(req.params.nodeId, enabled);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to set maintenance mode',
        message: (error as Error).message
      });
    }
  });

  return router;
}
