/**
 * Entity extraction routes
 */

import { Router } from 'express';
import { NERExtractor, EntityDisambiguator } from '@intelgraph/entity-extraction';

export function createEntityRouter(): Router {
  const router = Router();

  const nerExtractor = new NERExtractor();
  const disambiguator = new EntityDisambiguator();

  /**
   * POST /api/entities/extract
   * Extract named entities
   */
  router.post('/extract', async (req, res, next) => {
    try {
      const { text, options } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const entities = nerExtractor.extract(text);

      res.json({ entities });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/entities/disambiguate
   * Disambiguate entities
   */
  router.post('/disambiguate', async (req, res, next) => {
    try {
      const { entities, text } = req.body;

      if (!entities || !text) {
        return res.status(400).json({ error: 'Entities and text are required' });
      }

      const clusters = disambiguator.disambiguate(entities, text);

      res.json({ clusters });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
