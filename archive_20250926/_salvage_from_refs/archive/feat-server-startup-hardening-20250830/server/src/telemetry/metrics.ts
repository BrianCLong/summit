import client from "prom-client";
export const reg = new client.Registry();
client.collectDefaultMetrics({ register: reg });

export const httpLatency = new client.Histogram({
  name: "assistant_http_latency_ms",
  help: "latency for /assistant/*",
  buckets: [25, 50, 100, 200, 350, 500, 1000, 2000, 5000],
  labelNames: ["path", "method", "status"] as const,
});
export const httpErrors = new client.Counter({
  name: "assistant_http_errors_total",
  help: "errors on /assistant/*",
  labelNames: ["path", "code"] as const,
});
export const tokensOut = new client.Counter({
  name: "assistant_tokens_streamed_total",
  help: "tokens streamed to clients",
  labelNames: ["mode"] as const,
});
reg.registerMetric(httpLatency); reg.registerMetric(httpErrors); reg.registerMetric(tokensOut);
