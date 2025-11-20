import { Router } from 'express';
import type { FederatedTrainer } from '@intelgraph/federated-learning';

export function createFederatedRoutes(trainer: FederatedTrainer): Router {
  const router = Router();

  // Initialize federated learning
  router.post('/initialize', async (req, res) => {
    try {
      const { model } = req.body;

      await trainer.initialize(model);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to initialize federated learning',
        message: (error as Error).message
      });
    }
  });

  // Start training round
  router.post('/rounds/start', async (req, res) => {
    try {
      const { availableNodes } = req.body;

      const round = await trainer.startRound(availableNodes);

      res.status(200).json(round);
    } catch (error) {
      res.status(400).json({
        error: 'Failed to start training round',
        message: (error as Error).message
      });
    }
  });

  // Submit local update
  router.post('/rounds/update', async (req, res) => {
    try {
      const update = req.body;

      await trainer.submitUpdate(update);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to submit update',
        message: (error as Error).message
      });
    }
  });

  // Get current round
  router.get('/rounds/current', (req, res) => {
    const round = trainer.getCurrentRound();

    if (!round) {
      return res.status(404).json({ error: 'No active round' });
    }

    res.json(round);
  });

  // Get training history
  router.get('/rounds/history', (req, res) => {
    const history = trainer.getTrainingHistory();

    res.json({ rounds: history, total: history.length });
  });

  // Get global model
  router.get('/model', (req, res) => {
    const model = trainer.getGlobalModel();

    if (!model) {
      return res.status(404).json({ error: 'No global model available' });
    }

    res.json({ model });
  });

  // Get training statistics
  router.get('/stats', (req, res) => {
    const stats = trainer.getStats();

    res.json(stats);
  });

  // Reset trainer
  router.post('/reset', async (req, res) => {
    try {
      await trainer.reset();

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to reset trainer',
        message: (error as Error).message
      });
    }
  });

  return router;
}
