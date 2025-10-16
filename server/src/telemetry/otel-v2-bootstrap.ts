/**
 * OpenTelemetry v2 Bootstrap for IntelGraph Platform
 * Updated SDK configuration with new Metrics API and Attribute limits
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Enhanced resource configuration for IntelGraph Platform
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]:
    process.env.OTEL_SERVICE_NAME || 'intelgraph-server',
  [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || '1.24.0',
  'deployment.environment': process.env.NODE_ENV || 'development',
  'intelgraph.platform.version': '24.3.0',
  'intelgraph.tenant.id': process.env.TENANT_ID || 'default',
  'intelgraph.region': process.env.AWS_REGION || 'us-east-1',
});

// Trace exporter configuration
const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    'http://localhost:4318/v1/traces',
  headers: {
    'x-api-key': process.env.OTEL_API_KEY || '',
    'x-tenant-id': process.env.TENANT_ID || 'default',
  },
});

// Metrics exporter with new v2 reader pattern
const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url:
      process.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
      'http://localhost:4318/v1/metrics',
    headers: {
      'x-api-key': process.env.OTEL_API_KEY || '',
      'x-tenant-id': process.env.TENANT_ID || 'default',
    },
  }),
  exportIntervalMillis: 30000, // 30 second intervals
  exportTimeoutMillis: 5000, // 5 second timeout
});

// NodeSDK v2 configuration
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enhanced instrumentation configuration
      '@opentelemetry/instrumentation-express': {
        requestHook: (span, info) => {
          // Add IntelGraph-specific attributes
          span.setAttributes({
            'intelgraph.request.tenant_id':
              info.req.headers['x-tenant-id'] || 'default',
            'intelgraph.request.user_id':
              info.req.headers['x-user-id'] || 'anonymous',
            'intelgraph.request.trace_id': span.spanContext().traceId,
          });
        },
      },
      '@opentelemetry/instrumentation-graphql': {
        mergeItems: true,
        allowValues: true,
      },
      '@opentelemetry/instrumentation-redis': {
        dbStatementSerializer: (cmdName, cmdArgs) => {
          // Sanitize sensitive Redis commands
          if (cmdName.toLowerCase().includes('auth')) {
            return `${cmdName} [REDACTED]`;
          }
          return `${cmdName} ${cmdArgs.join(' ')}`;
        },
      },
      '@opentelemetry/instrumentation-pg': {
        enhancedDatabaseReporting: true,
      },
    }),
  ],
});

// Initialize OpenTelemetry v2
export function initializeOTelV2(): void {
  try {
    sdk.start();
    console.log('✅ OpenTelemetry v2 initialized successfully');

    // Health check span
    const tracer = require('@opentelemetry/api').trace.getTracer(
      'intelgraph-bootstrap',
    );
    tracer.startSpan('otel.initialization').end();
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry v2:', error);
    throw error;
  }
}

// Graceful shutdown
export function shutdownOTel(): Promise<void> {
  return sdk.shutdown();
}

// Process signal handlers
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry v2 terminated'))
    .catch((error) =>
      console.error('Error terminating OpenTelemetry v2', error),
    )
    .finally(() => process.exit(0));
});

export { sdk };
