import prom from "prom-client";

export const queueDepth = new prom.Gauge({
  name: "queue_depth",
  help: "pending jobs",
});

export const queueProcessed = new prom.Counter({
  name: "queue_processed_total",
  help: "total jobs processed by the worker",
  labelNames: ["status", "type"],
});

export const queueProcessingDuration = new prom.Histogram({
  name: "queue_processing_seconds",
  help: "job processing duration",
  labelNames: ["type"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export const cacheHits = new prom.Counter({
  name: "cache_hits_total",
  help: "cache hits",
});

export const cacheMiss = new prom.Counter({
  name: "cache_misses_total",
  help: "cache misses",
});
