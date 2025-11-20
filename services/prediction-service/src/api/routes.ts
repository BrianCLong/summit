/**
 * Prediction Service API Routes
 */

import express, { type Request, type Response } from 'express';
import { PredictionEngine } from '../core/prediction-engine.js';
import { ModelRegistry } from '../core/model-registry.js';
import type { PredictionRequest } from '../types/index.js';

export function createPredictionRoutes(
  engine: PredictionEngine,
  registry: ModelRegistry
): express.Router {
  const router = express.Router();

  /**
   * POST /predict - Make predictions
   */
  router.post('/predict', async (req: Request, res: Response) => {
    try {
      const request: PredictionRequest = req.body;

      // Validate request
      if (!request.modelId || !request.modelType || !request.features) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'modelId, modelType, and features are required',
        });
        return;
      }

      const response = await engine.predict(request);
      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Prediction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /models - List all models
   */
  router.get('/models', (req: Request, res: Response) => {
    const models = engine.listModels();
    res.json({ models });
  });

  /**
   * GET /models/:id - Get model details
   */
  router.get('/models/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const metadata = engine.getModelMetadata(id);

    if (!metadata) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    const versions = registry.listVersions(id);
    const champion = registry.getChampion(id);
    const driftHistory = registry.getDriftHistory(id);
    const needsRetraining = registry.needsRetraining(id);

    res.json({
      metadata,
      versions: versions.map(v => ({
        version: v.version,
        deployedAt: v.deployedAt,
        performance: v.performance,
      })),
      champion: champion?.version,
      driftHistory,
      needsRetraining,
    });
  });

  /**
   * POST /models/:id/promote - Promote model version to champion
   */
  router.post('/models/:id/promote', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { version } = req.body;

      if (!version) {
        res.status(400).json({ error: 'Version is required' });
        return;
      }

      registry.promoteToChampion(id, version);
      res.json({ message: 'Model promoted successfully', modelId: id, version });
    } catch (error) {
      res.status(500).json({
        error: 'Promotion failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /health - Health check
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      models: engine.listModels().length,
    });
  });

  return router;
}
