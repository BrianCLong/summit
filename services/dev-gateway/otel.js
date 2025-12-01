#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * OpenTelemetry instrumentation for dev-gateway
 *
 * This file sets up distributed tracing for the development gateway.
 * It exports traces to Jaeger and metrics to Prometheus.
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

const serviceName = process.env.OTEL_SERVICE_NAME || 'summit-gateway';
const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
const environment = process.env.NODE_ENV || 'development';

// Configure resource attributes
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
  })
);

// Configure exporters
const traceExporter = process.env.JAEGER_ENDPOINT
  ? new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT,
    })
  : undefined;

const metricExporter = new PrometheusExporter({
  port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
});

// Initialize SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: metricExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingPaths: ['/health', '/metrics'],
      },
      '@opentelemetry/instrumentation-express': {
        enabled: false, // Not using Express
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

// Start the SDK
sdk.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await sdk.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await sdk.shutdown();
  process.exit(0);
});

console.log('[otel] OpenTelemetry initialized:', {
  service: serviceName,
  version: serviceVersion,
  environment,
  jaegerEnabled: !!process.env.JAEGER_ENDPOINT,
});

module.exports = sdk;
