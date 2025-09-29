import express from "express";
import client from "prom-client";

export const metricsRouter = express.Router();

// Histograms/gauges/counters
export const routeLatency = new client.Histogram({
  name: "symphony_route_execute_latency_ms",
  help: "Route execute latency",
  labelNames: ["model", "tenant"],
  buckets: [50, 100, 200, 400, 800, 1200, 2000, 4000, 8000]
});

export const tokensTotal = new client.Counter({
  name: "symphony_tokens_total",
  help: "Token usage",
  labelNames: ["model", "tenant", "type"],
});

export const decisionsTotal = new client.Counter({
  name: "symphony_route_decisions_total",
  help: "Decisions taken",
  labelNames: ["model", "reason"],
});

export const budgetFraction = new client.Gauge({
  name: "symphony_budget_fraction_used",
  help: "Budget fraction used per model",
  labelNames: ["model"],
});

export const powerWindowOpen = new client.Gauge({
  name: "symphony_power_window_open",
  help: "Power window open (0/1)",
  labelNames: ["model"],
});

export const errorsTotal = new client.Counter({
  name: "symphony_errors_total",
  help: "Errors by route",
  labelNames: ["route", "code"],
});

export const ragStaleness = new client.Gauge({
  name: "rag_index_staleness_seconds",
  help: "RAG staleness seconds",
  labelNames: ["corpus"],
});

metricsRouter.get("/", async (_req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err: any) {
    res.status(500).end(err?.message || "metrics error");
  }
});

export function registerDefaultMetrics() {
  client.collectDefaultMetrics({ register: client.register });
}
