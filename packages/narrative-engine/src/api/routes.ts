import { Router, type Request, type Response } from 'express';
import { SimulationEngine } from '../core/SimulationEngine.js';
import type { Event, SimConfig } from '../core/types.js';

export function createNarrativeRouter(engine?: SimulationEngine): Router {
  const router = Router();
  const runtime = engine ?? new SimulationEngine();

  router.post('/api/narrative/init', (req: Request, res: Response) => {
    const config = req.body as SimConfig;
    try {
      runtime.initialize(config);
      res
        .status(200)
        .json({
          status: 'initialized',
          timestamp: runtime.getState().timestamp,
        });
    } catch (error) {
      res
        .status(400)
        .json({ status: 'error', message: (error as Error).message });
    }
  });

  router.post('/api/narrative/step', (_req: Request, res: Response) => {
    try {
      runtime.step();
      res
        .status(200)
        .json({ status: 'advanced', timestamp: runtime.getState().timestamp });
    } catch (error) {
      res
        .status(400)
        .json({ status: 'error', message: (error as Error).message });
    }
  });

  router.post('/api/narrative/inject-event', (req: Request, res: Response) => {
    const event = req.body as Event;
    try {
      runtime.injectEvent(event);
      res.status(202).json({ status: 'accepted', queueSize: 1 });
    } catch (error) {
      res
        .status(400)
        .json({ status: 'error', message: (error as Error).message });
    }
  });

  router.get('/api/narrative/state', (_req: Request, res: Response) => {
    try {
      const snapshot = runtime.getState().toJSON();
      res.status(200).json(snapshot);
    } catch (error) {
      res
        .status(400)
        .json({ status: 'error', message: (error as Error).message });
    }
  });

  return router;
}
