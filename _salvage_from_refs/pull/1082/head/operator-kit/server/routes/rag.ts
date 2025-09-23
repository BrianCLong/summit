import express from "express";
import { ragStaleness } from "../metrics";
import { emit } from "../events";

export const ragRouter = express.Router();

let lastIndexedAt = Date.now() - 1000 * 60 * 60 * 25; // pretend stale by 25h
let corpus = process.env.RAG_CORPUS || "docs";

ragRouter.get("/status", (_req, res) => {
  const staleness = Math.max(0, Math.floor((Date.now() - lastIndexedAt) / 1000));
  ragStaleness.labels(corpus).set(staleness);
  emit({ type: "rag.index.freshness", corpus, staleness_s: staleness });
  res.json({ corpus, last_indexed_at: new Date(lastIndexedAt).toISOString(), staleness_seconds: staleness, warn: staleness > 86400 });
});

ragRouter.post("/reindex", (req, res) => {
  const dry = String(req.query.dry_run || "0") === "1";
  if (dry) return res.json({ estimate_docs: 1200, estimate_tokens: 1.8e6, estimate_duration_s: 420 });
  lastIndexedAt = Date.now();
  res.json({ ok: true, last_indexed_at: new Date(lastIndexedAt).toISOString() });
});
