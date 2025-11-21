import { Router, Request, Response } from 'express';
import { DataDiscoveryFusionEngine } from '../DataDiscoveryFusionEngine.js';
import { logger } from '../utils/logger.js';

export function createRoutes(engine: DataDiscoveryFusionEngine): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    const stats = engine.getStats();
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      stats,
    });
  });

  // Source Discovery
  router.post('/sources/scan', async (_req: Request, res: Response) => {
    try {
      const result = await engine.scan();
      res.json({ success: true, result });
    } catch (error) {
      logger.error('Scan failed', { error });
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  router.get('/sources', (_req: Request, res: Response) => {
    const sources = engine.getDiscoveredSources();
    res.json({ sources });
  });

  router.post('/sources', async (req: Request, res: Response) => {
    try {
      const { type, uri, credentials, scanPattern } = req.body;
      engine.addScanEndpoint({ type, uri, credentials, scanPattern });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, error: String(error) });
    }
  });

  // Data Profiling
  router.post('/profile/:sourceId', async (req: Request, res: Response) => {
    try {
      const { sourceId } = req.params;
      const { data } = req.body;
      const profile = await engine.profileSource(sourceId, data);
      res.json({ success: true, profile });
    } catch (error) {
      logger.error('Profiling failed', { error });
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  router.get('/profile/:sourceId', (req: Request, res: Response) => {
    const { sourceId } = req.params;
    const profile = engine.getProfile(sourceId);
    if (profile) {
      res.json({ profile });
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  });

  router.get('/profile/:sourceId/report', (req: Request, res: Response) => {
    const { sourceId } = req.params;
    const report = engine.getProfileReport(sourceId);
    if (report) {
      res.type('text/markdown').send(report);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  });

  // Data Fusion
  router.post('/fuse', async (req: Request, res: Response) => {
    try {
      const { records, matchFields, strategy } = req.body;
      const results = await engine.fuse(records, matchFields, strategy);
      res.json({ success: true, results });
    } catch (error) {
      logger.error('Fusion failed', { error });
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  router.post('/deduplicate', async (req: Request, res: Response) => {
    try {
      const { records, matchFields } = req.body;
      const results = await engine.deduplicate(records, matchFields);
      res.json({ success: true, results });
    } catch (error) {
      logger.error('Deduplication failed', { error });
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  router.get('/fusion/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const result = engine.getFusionResult(id);
    if (result) {
      res.json({ result });
    } else {
      res.status(404).json({ error: 'Fusion result not found' });
    }
  });

  // Confidence Scoring
  router.get('/confidence/:fusionId', (req: Request, res: Response) => {
    const { fusionId } = req.params;
    const report = engine.getConfidenceReport(fusionId);
    if (report) {
      res.json({ report });
    } else {
      res.status(404).json({ error: 'Fusion result not found' });
    }
  });

  router.get('/confidence/:fusionId/visualization', (req: Request, res: Response) => {
    const { fusionId } = req.params;
    const viz = engine.getConfidenceVisualization(fusionId);
    if (viz) {
      res.json(viz);
    } else {
      res.status(404).json({ error: 'Fusion result not found' });
    }
  });

  // Feedback & Learning
  router.post('/feedback', async (req: Request, res: Response) => {
    try {
      const { userId, fusionId, feedbackType, correction, comment } = req.body;
      const feedback = engine.recordFeedback(
        userId,
        fusionId,
        feedbackType,
        correction,
        comment
      );
      res.json({ success: true, feedback });
    } catch (error) {
      logger.error('Feedback recording failed', { error });
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  router.get('/feedback/:fusionId', (req: Request, res: Response) => {
    const { fusionId } = req.params;
    const feedback = engine.getFeedback(fusionId);
    res.json({ feedback });
  });

  router.get('/learning/stats', (_req: Request, res: Response) => {
    const stats = engine.getLearningStats();
    res.json({ stats });
  });

  router.get('/learning/context/:sourceId', (req: Request, res: Response) => {
    const { sourceId } = req.params;
    const context = engine.getLearningContext(sourceId);
    if (context) {
      res.json({ context });
    } else {
      res.status(404).json({ error: 'Context not found' });
    }
  });

  // Automation & Recipes
  router.get('/recipes', (_req: Request, res: Response) => {
    const recipes = engine.getAutomationRecipes();
    res.json({ recipes });
  });

  router.post('/recipes/execute/:recipeId', async (req: Request, res: Response) => {
    try {
      const { recipeId } = req.params;
      const { params } = req.body;
      const result = await engine.executeRecipe(recipeId, params);
      res.json({ success: true, result });
    } catch (error) {
      logger.error('Recipe execution failed', { error });
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  return router;
}
