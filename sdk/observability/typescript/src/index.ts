import { diag, DiagConsoleLogger, DiagLogLevel, context } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { metrics } from "@opentelemetry/api";
import { env } from "process";
import pino, { Logger } from "pino";

export interface ObservabilityConfig {
  serviceName: string;
  serviceNamespace?: string;
  environment?: string;
  otlpEndpoint?: string;
  traceSampleRatio?: number;
  piiRedactionEnabled?: boolean;
}

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

const defaultBuckets = [0.05, 0.1, 0.25, 0.5, 1, 2, 5];

export async function initObservability(config: ObservabilityConfig) {
  const cfg = withDefaults(config);
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: `${cfg.otlpEndpoint}/v1/traces`,
    }),
    metricExporter: new OTLPMetricExporter({
      url: `${cfg.otlpEndpoint}/v1/metrics`,
    }),
    resource: new Resource({
      "service.name": cfg.serviceName,
      "service.namespace": cfg.serviceNamespace,
      "deployment.environment": cfg.environment,
    }),
  });

  await sdk.start();
  const instruments = registerGoldenMetrics(cfg);
  return { sdk, instruments };
}

function withDefaults(config: ObservabilityConfig) {
  return {
    serviceNamespace: "summit-portfolio",
    environment: env.DEPLOY_ENV ?? "development",
    otlpEndpoint: env.OTLP_ENDPOINT ?? "http://otel-collector:4318",
    traceSampleRatio: 0.05,
    piiRedactionEnabled: true,
    ...config,
  };
}

export function getLogger(cfg: ObservabilityConfig): Logger {
  const settings = withDefaults(cfg);
  return pino({
    level: env.LOG_LEVEL ?? "info",
    base: {
      "service.name": settings.serviceName,
      "service.namespace": settings.serviceNamespace,
      "deployment.environment": settings.environment,
    },
    mixin() {
      return {
        trace_id: context.active().getValue(Symbol.for("trace_id")) ?? "",
        span_id: context.active().getValue(Symbol.for("span_id")) ?? "",
      };
    },
    formatters: {
      log(object) {
        if (!settings.piiRedactionEnabled) return object;
        return Object.fromEntries(
          Object.entries(object).map(([key, value]) => [key, redactValue(String(value))])
        );
      },
    },
  });
}

export function registerGoldenMetrics(cfg: ObservabilityConfig) {
  const meter = metrics.getMeter(cfg.serviceName);
  const latency = meter.createHistogram("http_server_request_duration_seconds", {
    description: "End-to-end API latency",
    unit: "s",
    boundaries: defaultBuckets,
  });
  const requestCount = meter.createCounter("http_server_request_total", {
    description: "Total request volume",
  });
  const workerLatency = meter.createHistogram("worker_job_duration_seconds", {
    description: "Background job latency",
    unit: "s",
    boundaries: defaultBuckets,
  });

  return {
    recordHttpLatency(durationSeconds: number, attributes: Record<string, string>) {
      latency.record(durationSeconds, attributes);
    },
    incrementHttpRequests(attributes: Record<string, string>) {
      requestCount.add(1, attributes);
    },
    recordWorkerLatency(durationSeconds: number, attributes: Record<string, string>) {
      workerLatency.record(durationSeconds, attributes);
    },
  };
}

function redactValue(value: string) {
  const tokens = ["email", "ssn", "card"];
  for (const token of tokens) {
    if (value.toLowerCase().includes(token)) {
      return `${token}:***redacted***`;
    }
  }
  return value;
}
