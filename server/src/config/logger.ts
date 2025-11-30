import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: 1 }, // stdout
    },
    // Optional: Add transport for Logstash if configured
    ...(process.env.LOGSTASH_HOST ? [{
      target: 'pino-socket',
      options: {
        address: process.env.LOGSTASH_HOST,
        port: 5000,
        mode: 'tcp',
        reconnect: true,
      }
    }] : [])
  ],
});

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  mixin() {
    // Add Trace ID and Span ID to every log from OpenTelemetry context
    const currentSpan = trace.getSpan(context.active());
    if (currentSpan) {
      const spanContext = currentSpan.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        service: process.env.OTEL_SERVICE_NAME || 'api'
      };
    }
    return { service: process.env.OTEL_SERVICE_NAME || 'api' };
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}, transport);

export default logger;
