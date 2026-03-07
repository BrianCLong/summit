// @ts-nocheck
import { randomUUID } from "node:crypto";
import { Histogram, Registry, collectDefaultMetrics, Counter } from "prom-client";
import type { RequestHandler } from "express";

export interface MetricsBundle {
  registry: Registry;
  httpHistogram: Histogram<string>;
  errorCounter: Counter<string>;
}

export function createMetrics(): MetricsBundle {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });
  const httpHistogram = new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });
  const errorCounter = new Counter({
    name: "http_request_errors_total",
    help: "Count of error responses",
    labelNames: ["route", "status"],
    registers: [registry],
  });
  return { registry, httpHistogram, errorCounter };
}

export function createHttpMetricsMiddleware(bundle: MetricsBundle): RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const delta = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      bundle.httpHistogram
        .labels(req.method, req.route?.path ?? req.path, res.statusCode.toString())
        .observe(delta);
      if (res.statusCode >= 500) {
        bundle.errorCounter.labels(req.route?.path ?? req.path, res.statusCode.toString()).inc();
      }
    });
    next();
  };
}

export function createTraceMiddleware(): RequestHandler {
  return (req, res, next) => {
    const traceId = req.headers["x-trace-id"]?.toString() ?? randomUUID();
    res.locals.traceId = traceId;
    res.setHeader("x-trace-id", traceId);
    next();
  };
}
