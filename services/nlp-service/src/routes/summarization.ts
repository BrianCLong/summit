/**
 * Summarization routes
 */

import { Router } from 'express';
import { Summarizer } from '@intelgraph/language-models';

export function createSummaryRouter(): Router {
  const router = Router();

  const summarizer = new Summarizer();

  /**
   * POST /api/summarization/extractive
   * Extractive summarization
   */
  router.post('/extractive', async (req, res, next) => {
    try {
      const { text, maxSentences = 3 } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = await summarizer.extractive(text, maxSentences);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/summarization/abstractive
   * Abstractive summarization
   */
  router.post('/abstractive', async (req, res, next) => {
    try {
      const { text, maxLength = 150 } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = await summarizer.abstractive(text, maxLength);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
