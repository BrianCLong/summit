import { Router, Request, Response } from 'express';
import { FactFlowService } from './service.js';
import { logger as appLogger } from '../config/logger.js';

const router = Router();
const service = new FactFlowService(appLogger);

router.get('/status', (req: Request, res: Response) => {
  res.json({ status: 'active', version: '0.1.0' });
});

router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioUrl } = req.body;
    if (!audioUrl) {
       res.status(400).json({ error: 'audioUrl is required' });
       return;
    }
    const result = await service.transcribe(audioUrl);
    res.json(result);
  } catch (error) {
    appLogger.error(error, 'Transcription failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { claim } = req.body;
    if (!claim) {
       res.status(400).json({ error: 'claim is required' });
       return;
    }
    const result = await service.verifyClaim(claim);
    res.json(result);
  } catch (error) {
    appLogger.error(error, 'Verification failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
