import { Router } from 'express';
import { gamMemoryService } from '../memory/gam/service.js';

const router = Router();

router.post('/memory/ingest_session', async (req, res, next) => {
  try {
    const payload = req.body;
    const result = await gamMemoryService.ingestSession(payload);
    res.json(result);
  } catch (error: any) {
    if (error?.message?.includes('disabled')) {
      res.status(503).json({ error: 'GAM memory is disabled via feature flag' });
      return;
    }
    next(error);
  }
});

router.post('/memory/build_context', async (req, res, next) => {
  try {
    const payload = req.body;
    const result = await gamMemoryService.buildContext(payload);
    res.json(result);
  } catch (error: any) {
    if (error?.message?.includes('disabled')) {
      res.status(503).json({ error: 'GAM memory is disabled via feature flag' });
      return;
    }
    next(error);
  }
});

export const gamMemoryRouter = router;
