/**
 * Logging Pipeline
 *
 * Unified audit event ingestion pipeline with backpressure handling.
 * Provides adapters for services to send normalized audit events.
 *
 * Features:
 * - Non-blocking event submission
 * - Backpressure signaling via Redis pub/sub
 * - Service adapters for common event patterns
 * - Event validation and normalization
 * - Dead letter queue for failed events
 */

// Re-export sink components
export {
  AuditSink,
  type AuditEventInput,
  type AuditSinkConfig,
  type SubmitResult,
  DEFAULT_SINK_CONFIG,
} from './sink/audit-sink.js';

// Re-export adapter components
export {
  ServiceAuditAdapter,
  type ServiceAdapterConfig,
  type AuditContext,
  type AccessEventInput,
  type ExportEventInput,
  type AdminChangeEventInput,
  type PolicyChangeEventInput,
  type ModelSelectionEventInput,
  type SecurityEventInput,
  type ResourceEventInput,
} from './adapters/service-adapter.js';

/**
 * Create a configured audit sink
 */
export async function createAuditSink(config: {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  queueName?: string;
  maxQueueSize?: number;
}): Promise<import('./sink/audit-sink.js').AuditSink> {
  const { AuditSink, DEFAULT_SINK_CONFIG } = await import('./sink/audit-sink.js');

  const sink = new AuditSink({
    redis: config.redis,
    queueName: config.queueName || DEFAULT_SINK_CONFIG.queueName!,
    deadLetterQueueName: `${config.queueName || DEFAULT_SINK_CONFIG.queueName}:dlq`,
    maxRetries: DEFAULT_SINK_CONFIG.maxRetries!,
    retryDelayMs: DEFAULT_SINK_CONFIG.retryDelayMs!,
    backpressureChannel: DEFAULT_SINK_CONFIG.backpressureChannel!,
    maxQueueSize: config.maxQueueSize || DEFAULT_SINK_CONFIG.maxQueueSize!,
  });

  await sink.initialize();

  return sink;
}

/**
 * Create a service adapter
 */
export function createServiceAdapter(config: {
  serviceId: string;
  serviceName: string;
  serviceVersion?: string;
  environment: 'development' | 'staging' | 'production';
  tenantId?: string;
  defaultTags?: string[];
  sink: import('./sink/audit-sink.js').AuditSink;
}): import('./adapters/service-adapter.js').ServiceAuditAdapter {
  const { ServiceAuditAdapter } = require('./adapters/service-adapter.js');

  return new ServiceAuditAdapter({
    serviceId: config.serviceId,
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
    environment: config.environment,
    tenantId: config.tenantId,
    defaultTags: config.defaultTags,
    sink: config.sink,
  });
}
