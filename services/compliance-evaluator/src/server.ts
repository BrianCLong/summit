import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { ComplianceEvaluator } from "./evaluator.js";
import { EvidenceBase } from "./types.js";

export function createServer(evaluator: ComplianceEvaluator) {
  const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));

  app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

  app.post("/v1/evidence", async (req, res) => {
    const evidence = req.body as EvidenceBase;
    const nowIso = new Date().toISOString();
    try {
      const attestation = await evaluator.handleEvidence(evidence, nowIso);
      res.status(200).json({ attestation });
    } catch (error: any) {
      req.log.error({ err: error }, "evaluation failed");
      res.status(500).json({ error: "evaluation_failed" });
    }
  });

  return { app, logger };
}
