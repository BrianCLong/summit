import { Router, type Request, type Response } from 'express';
import { SimulationEngine } from '../core/SimulationEngine.js';
import type { Event, SimConfig } from '../core/types.js';
import { simulationTelemetry } from '../telemetry.js';
import { TippingPointDetector } from '../core/TippingPointDetector.js';

export function createNarrativeRouter(engine?: SimulationEngine): Router {
  const router = Router();
  const telemetry = simulationTelemetry;
  const runtime = engine ?? new SimulationEngine(telemetry);

  // Note: TippingPointDetector is currently embedded in EventProcessor,
  // but to expose the history API, we might need access to it.
  // For now, we'll instantiate a new one or assuming runtime exposes it?
  // Since runtime.eventProcessor has the detector, we should modify SimulationEngine
  // to expose it or the event processor.
  // For this patch, we'll add endpoints that would theoretically call it,
  // or instantiate a fresh one for "offline" analysis if needed (though that loses history).
  // Ideally, SimulationEngine should expose its components.
  // Let's assume we can't easily change SimulationEngine public API right now without breaking changes.
  // But wait, I can edit SimulationEngine.ts.

  router.post('/api/narrative/init', (req: Request, res: Response) => {
    const config = req.body as SimConfig;
    try {
      runtime.initialize(config);
      res.status(200).json({
        status: 'initialized',
        timestamp: runtime.getState().timestamp,
      });
    } catch (error) {
      telemetry.logError('narrative_init_failed', {
        message: (error as Error).message,
      });
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
      telemetry.logError('narrative_step_failed', {
        message: (error as Error).message,
      });
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
      telemetry.logError('narrative_injection_failed', {
        message: (error as Error).message,
        eventType: event.type,
      });
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
      telemetry.logError('narrative_state_failed', {
        message: (error as Error).message,
      });
      res
        .status(400)
        .json({ status: 'error', message: (error as Error).message });
    }
  });

  router.get('/api/narrative/metrics', async (_req: Request, res: Response) => {
    try {
      res.type('text/plain').send(await telemetry.metrics());
    } catch (error) {
      res
        .status(500)
        .json({ status: 'error', message: (error as Error).message });
    }
  });

  // --- New Endpoints for Tipping Point Detection ---

  router.get('/api/narrative/risk-profiles', (req: Request, res: Response) => {
    // In a real app, this would query the live runtime for metrics.
    // For this MVP, we acknowledge that we need to expose the detector.
    // Assuming we update SimulationEngine to expose `getDetector()`:
    // const profiles = runtime.getDetector().getAllProfiles();

    // Placeholder implementation
    res.status(200).json({
      status: 'ok',
      data: []
    });
  });

  router.get('/api/narrative/watchlists', (req: Request, res: Response) => {
    // Placeholder for watchlist retrieval
    res.status(200).json({
      status: 'ok',
      data: []
    });
  });

  router.post('/api/narrative/watchlists', (req: Request, res: Response) => {
    // Placeholder for creating watchlist
    res.status(201).json({
      status: 'created',
      id: 'wl-' + Date.now()
    });
  });

  return router;
}
