import { Router } from 'express';
import { collectCacheAnalytics } from '../cache/cacheAnalytics.js';

const cacheAnalyticsRouter = Router();

cacheAnalyticsRouter.get('/analytics', async (_req, res) => {
  try {
    const analytics = await collectCacheAnalytics();
    res.json({ status: 'ok', analytics });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: (error as Error).message,
    });
  }
});

export default cacheAnalyticsRouter;
