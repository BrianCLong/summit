import express from 'express';
import { NlToCypherPreviewService } from '../ai/nl-to-cypher/nl-to-cypher-preview.service.js';
import { logger } from '../utils/logger.js';

export const buildNlToCypherPreviewRouter = (
  service: NlToCypherPreviewService = new NlToCypherPreviewService(),
) => {
  const router = express.Router();

  router.post('/preview/v1/nl-to-cypher', async (req, res) => {
    try {
      const result = await service.preview(req.body);
      res.json(result);
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in (error as any)) {
        const status = (error as any).status ?? 400;
        res.status(status).json({
          error: (error as Error).message,
          code: (error as any).reason ?? (error as any).policy,
        });
        return;
      }

      logger.error({ error }, 'NL→Cypher preview failed');
      res.status(500).json({ error: 'Unable to generate preview candidates' });
    }
  });

  return router;
};

export default buildNlToCypherPreviewRouter;
