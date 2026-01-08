import client from "prom-client";
import { percentile } from "common-types";

export class MetricsRecorder {
  constructor() {
    this.latencies = [];
    this.costs = [];
    this.qualities = [];
    this.cacheHits = 0;
    this.total = 0;
  }

  record({ latency, cost, quality, cacheHit }) {
    if (Number.isFinite(latency)) {
      this.latencies.push(latency);
    }
    if (Number.isFinite(cost)) {
      this.costs.push(cost);
    }
    if (Number.isFinite(quality)) {
      this.qualities.push(quality);
    }
    if (cacheHit) {
      this.cacheHits += 1;
    }
    this.total += 1;
  }

  snapshot() {
    return {
      p50Latency: percentile(this.latencies, 0.5),
      p95Latency: percentile(this.latencies, 0.95),
      avgCost:
        this.costs.length === 0 ? 0 : this.costs.reduce((a, b) => a + b, 0) / this.costs.length,
      avgQuality:
        this.qualities.length === 0
          ? 0
          : this.qualities.reduce((a, b) => a + b, 0) / this.qualities.length,
      cacheHitRate: this.total === 0 ? 0 : this.cacheHits / this.total,
    };
  }
}

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const aiCallLatency = new client.Histogram({
  name: "ai_call_latency_ms",
  help: "Latency for AI calls handled by the gateway (milliseconds)",
  buckets: [50, 100, 200, 400, 800, 1600, 3200],
  labelNames: ["operation", "model"],
  registers: [registry],
});

export const policyDenials = new client.Counter({
  name: "ai_policy_denials_total",
  help: "Total number of requests denied by policy",
  labelNames: ["reason"],
  registers: [registry],
});

export const gqlLatency = new client.Histogram({
  name: "gateway_graphql_latency",
  help: "GraphQL gateway request latency (milliseconds)",
  buckets: [50, 100, 200, 400, 800, 1600, 3200],
  labelNames: ["route", "status"],
  registers: [registry],
});

export const gqlRequests = new client.Counter({
  name: "gateway_graphql_requests_total",
  help: "Total GraphQL requests received by the gateway",
  labelNames: ["route", "status"],
  registers: [registry],
});

export const gqlErrors = new client.Counter({
  name: "gateway_graphql_errors_total",
  help: "GraphQL requests that returned non-2xx status codes",
  labelNames: ["route", "status"],
  registers: [registry],
});

export function observePolicyDeny(reason) {
  policyDenials.inc({ reason: reason ?? "unknown" });
}

export function observeSuccess(operation, modelId, adapterResult) {
  if (adapterResult?.latencyMs !== undefined) {
    aiCallLatency.observe({ operation, model: modelId ?? "unknown" }, adapterResult.latencyMs);
  }
}

export function timeGraphqlRequest(route = "graphql") {
  const stopTimer = gqlLatency.startTimer({ route });
  return (statusCode) => {
    const status = String(statusCode ?? 0);
    gqlRequests.inc({ route, status });
    if (statusCode && statusCode >= 400) {
      gqlErrors.inc({ route, status });
    }
    stopTimer({ route, status });
  };
}
