/**
 * Topic modeling routes
 */

import { Router } from 'express';
import { TopicModeler, DocumentClusterer } from '@intelgraph/text-analytics';

export function createTopicRouter(): Router {
  const router = Router();

  const topicModeler = new TopicModeler();
  const clusterer = new DocumentClusterer();

  /**
   * POST /api/topics/lda
   * LDA topic modeling
   */
  router.post('/lda', async (req, res, next) => {
    try {
      const { documents, numTopics = 10 } = req.body;

      if (!documents || !Array.isArray(documents)) {
        return res.status(400).json({ error: 'Documents array is required' });
      }

      const topics = topicModeler.lda(documents, numTopics);

      res.json({ topics });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/topics/cluster
   * Document clustering
   */
  router.post('/cluster', async (req, res, next) => {
    try {
      const { documents, k = 5 } = req.body;

      if (!documents || !Array.isArray(documents)) {
        return res.status(400).json({ error: 'Documents array is required' });
      }

      const clusters = clusterer.kmeans(documents, k);

      res.json({ clusters });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
