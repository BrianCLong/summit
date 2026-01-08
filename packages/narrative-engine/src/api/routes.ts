import { Router, type Request, type Response } from "express";
import { SimulationEngine } from "../core/SimulationEngine.js";
import type { Event, SimConfig } from "../core/types.js";
import { simulationTelemetry } from "../telemetry.js";

export function createNarrativeRouter(engine?: SimulationEngine): Router {
  const router = Router();
  const telemetry = simulationTelemetry;
  const runtime = engine ?? new SimulationEngine(telemetry);

  router.post("/api/narrative/init", (req: Request, res: Response) => {
    const config = req.body as SimConfig;
    try {
      runtime.initialize(config);
      res.status(200).json({
        status: "initialized",
        timestamp: runtime.getState().timestamp,
      });
    } catch (error) {
      telemetry.logError("narrative_init_failed", {
        message: (error as Error).message,
      });
      res.status(400).json({ status: "error", message: (error as Error).message });
    }
  });

  router.post("/api/narrative/step", (_req: Request, res: Response) => {
    try {
      runtime.step();
      res.status(200).json({ status: "advanced", timestamp: runtime.getState().timestamp });
    } catch (error) {
      telemetry.logError("narrative_step_failed", {
        message: (error as Error).message,
      });
      res.status(400).json({ status: "error", message: (error as Error).message });
    }
  });

  router.post("/api/narrative/inject-event", (req: Request, res: Response) => {
    const event = req.body as Event;
    try {
      runtime.injectEvent(event);
      res.status(202).json({ status: "accepted", queueSize: 1 });
    } catch (error) {
      telemetry.logError("narrative_injection_failed", {
        message: (error as Error).message,
        eventType: event.type,
      });
      res.status(400).json({ status: "error", message: (error as Error).message });
    }
  });

  router.get("/api/narrative/state", (_req: Request, res: Response) => {
    try {
      const snapshot = runtime.getState().toJSON();
      res.status(200).json(snapshot);
    } catch (error) {
      telemetry.logError("narrative_state_failed", {
        message: (error as Error).message,
      });
      res.status(400).json({ status: "error", message: (error as Error).message });
    }
  });

  router.get("/api/narrative/metrics", async (_req: Request, res: Response) => {
    try {
      res.type("text/plain").send(await telemetry.metrics());
    } catch (error) {
      res.status(500).json({ status: "error", message: (error as Error).message });
    }
  });

  return router;
}
