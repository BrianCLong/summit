/**
 * Sentiment analysis routes
 */

import { Router } from 'express';
import { SentimentAnalyzer } from '@intelgraph/text-analytics';

export function createSentimentRouter(): Router {
  const router = Router();

  const sentimentAnalyzer = new SentimentAnalyzer();

  /**
   * POST /api/sentiment/analyze
   * Analyze sentiment
   */
  router.post('/analyze', async (req, res, next) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = sentimentAnalyzer.analyze(text);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/sentiment/aspects
   * Aspect-based sentiment analysis
   */
  router.post('/aspects', async (req, res, next) => {
    try {
      const { text, aspects } = req.body;

      if (!text || !aspects) {
        return res.status(400).json({ error: 'Text and aspects are required' });
      }

      const result = sentimentAnalyzer.analyzeAspects(text, aspects);

      res.json({ aspects: result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
