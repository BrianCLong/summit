import { Router } from 'express';
import type { InferenceEngine } from '@intelgraph/edge-ai';

export function createInferenceRoutes(engine: InferenceEngine): Router {
  const router = Router();

  // Register a model
  router.post('/models', async (req, res) => {
    try {
      const { metadata, modelData } = req.body;

      await engine.registerModel(metadata, modelData);

      res.status(201).json({ success: true, modelId: metadata.id });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to register model',
        message: (error as Error).message
      });
    }
  });

  // List models
  router.get('/models', (req, res) => {
    const models = engine.getModels();

    res.json({ models, total: models.length });
  });

  // Get loaded models
  router.get('/models/loaded', (req, res) => {
    const loadedModels = engine.getLoadedModels();

    res.json({ models: loadedModels, total: loadedModels.length });
  });

  // Load model
  router.post('/models/:modelId/load', async (req, res) => {
    try {
      const { modelData } = req.body;

      await engine.loadModel(req.params.modelId, modelData);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to load model',
        message: (error as Error).message
      });
    }
  });

  // Unload model
  router.post('/models/:modelId/unload', async (req, res) => {
    try {
      await engine.unloadModel(req.params.modelId);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to unload model',
        message: (error as Error).message
      });
    }
  });

  // Run inference
  router.post('/infer', async (req, res) => {
    try {
      const { modelId, input, options } = req.body;

      const result = await engine.infer(modelId, input, options);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: 'Inference failed',
        message: (error as Error).message
      });
    }
  });

  // Batch inference
  router.post('/batch-infer', async (req, res) => {
    try {
      const { modelId, inputs, options } = req.body;

      const results = await engine.batchInfer(modelId, inputs, options);

      res.json({ results, total: results.length });
    } catch (error) {
      res.status(400).json({
        error: 'Batch inference failed',
        message: (error as Error).message
      });
    }
  });

  // Get model statistics
  router.get('/models/:modelId/stats', (req, res) => {
    const stats = engine.getModelStats(req.params.modelId);

    res.json(stats);
  });

  // Clear cache
  router.post('/cache/clear', (req, res) => {
    engine.clearCache();

    res.status(200).json({ success: true });
  });

  return router;
}
