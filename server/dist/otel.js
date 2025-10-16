import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
// Set diagnostic logging level (ERROR in prod, DEBUG in dev)
const logLevel = process.env.NODE_ENV === 'production'
    ? DiagLogLevel.ERROR
    : DiagLogLevel.INFO;
diag.setLogger(new DiagConsoleLogger(), logLevel);
// Service resource attributes
const resource = new Resource({
    'service.name': 'intelgraph-server',
    'service.version': process.env.GIT_SHA || process.env.npm_package_version || 'dev',
    'service.namespace': 'intelgraph',
    'deployment.environment': process.env.NODE_ENV || 'local',
    'container.id': process.env.HOSTNAME || 'local',
    'git.commit.sha': process.env.GIT_SHA,
    'git.repository.url': process.env.GIT_REPOSITORY_URL,
});
// OTLP exporters configuration
const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        'http://localhost:4318/v1/traces',
    headers: {
        Authorization: process.env.OTEL_EXPORTER_OTLP_HEADERS || '',
    },
});
const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace('/traces', '/metrics') ||
        'http://localhost:4318/v1/metrics',
    headers: {
        Authorization: process.env.OTEL_EXPORTER_OTLP_HEADERS || '',
    },
});
// Auto-instrumentations with custom configuration
const instrumentations = getNodeAutoInstrumentations({
    // HTTP instrumentation
    '@opentelemetry/instrumentation-http': {
        enabled: true,
        requestHook: (span, request) => {
            span.setAttributes({
                'http.request.body.size': request.headers['content-length'] || 0,
                'user.agent': request.headers['user-agent'] || 'unknown',
            });
        },
        responseHook: (span, response) => {
            span.setAttributes({
                'http.response.body.size': response.headers['content-length'] || 0,
            });
        },
    },
    // GraphQL instrumentation
    '@opentelemetry/instrumentation-graphql': {
        enabled: true,
        mergeItems: true,
        depth: 2,
        allowValues: process.env.NODE_ENV !== 'production',
    },
    // Database instrumentations
    '@opentelemetry/instrumentation-pg': {
        enabled: true,
        enhancedDatabaseReporting: true,
    },
    '@opentelemetry/instrumentation-redis': {
        enabled: true,
        dbStatementSerializer: (cmdName, cmdArgs) => {
            return process.env.NODE_ENV === 'production'
                ? cmdName
                : `${cmdName} ${cmdArgs.slice(0, 2).join(' ')}`;
        },
    },
});
// NodeSDK configuration
export const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000, // Export metrics every 30 seconds
    }),
    instrumentations,
});
let started = false;
export async function startOtel() {
    if (started)
        return;
    started = true;
    try {
        console.log('🔍 Starting OpenTelemetry instrumentation...');
        console.log(`📊 Service: ${resource.attributes['service.name']}`);
        console.log(`🏷️  Version: ${resource.attributes['service.version']}`);
        console.log(`🌍 Environment: ${resource.attributes['deployment.environment']}`);
        await sdk.start();
        console.log('✅ OpenTelemetry started successfully');
        // Graceful shutdown handling
        const shutdown = async () => {
            console.log('🛑 Shutting down OpenTelemetry...');
            try {
                await sdk.shutdown();
                console.log('✅ OpenTelemetry shutdown complete');
            }
            catch (error) {
                console.error('❌ Error during OpenTelemetry shutdown:', error);
            }
            process.exit(0);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
    catch (error) {
        console.error('❌ Failed to start OpenTelemetry:', error);
        // Don't fail the application if OTEL fails
        console.warn('⚠️  Continuing without observability...');
    }
}
export function isOtelStarted() {
    return started;
}
// Health check span for validation
export function createHealthSpan(spanName = 'health-check') {
    const { trace } = require('@opentelemetry/api');
    const tracer = trace.getTracer('intelgraph-health');
    return tracer.startSpan(spanName, {
        attributes: {
            'health.check': true,
            'service.name': 'intelgraph-server',
            'check.timestamp': new Date().toISOString(),
        },
    });
}
// Export tracer for manual instrumentation
export function getTracer(name = 'intelgraph') {
    const { trace } = require('@opentelemetry/api');
    return trace.getTracer(name);
}
// Environment validation
export function validateOtelConfig() {
    const required = ['OTEL_EXPORTER_OTLP_ENDPOINT'];
    const missing = required.filter((env) => !process.env[env]);
    if (missing.length > 0) {
        console.warn(`⚠️  Missing OTEL environment variables: ${missing.join(', ')}`);
        console.warn('⚠️  OpenTelemetry will use default endpoints');
        return false;
    }
    return true;
}
//# sourceMappingURL=otel.js.map