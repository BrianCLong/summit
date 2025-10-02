import express from "express";
import ConsentStateReconciler from "./reconciler";
import {
  ConsentRecord,
  DiffRequest,
  IngestResult,
  RollbackResult,
} from "./types";

export interface CreateAppOptions {
  reconciler?: ConsentStateReconciler;
}

export function createApp(options: CreateAppOptions = {}) {
  const reconciler = options.reconciler ?? new ConsentStateReconciler();
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/ingest", (req, res) => {
    const payload = req.body as { records?: ConsentRecord[] };
    if (!payload?.records || !Array.isArray(payload.records) || payload.records.length === 0) {
      res.status(400).json({ error: "records array is required" });
      return;
    }

    try {
      const result: IngestResult = reconciler.ingest(payload.records);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/diff", (req, res) => {
    const diffRequest: DiffRequest = {
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
      userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
    };

    try {
      const diff = reconciler.diff(diffRequest);
      res.json(diff);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/rollback", (req, res) => {
    const payload = req.body as { snapshotId?: string };
    if (!payload?.snapshotId) {
      res.status(400).json({ error: "snapshotId is required" });
      return;
    }

    try {
      const result: RollbackResult = reconciler.rollback(payload.snapshotId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/snapshots", (_req, res) => {
    res.json({ snapshots: reconciler.listSnapshots() });
  });

  return { app, reconciler };
}

export type AppFactory = ReturnType<typeof createApp>;
