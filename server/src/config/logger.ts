import { createLogger, format, transports, type Logger } from 'winston';
import type { TransformableInfo } from 'logform';
import TransportStream from 'winston-transport';
import { context, trace } from '@opentelemetry/api';
import { logs, type Logger as OtelLogger, type LogAttributes, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'intelgraph-api';
const environment = process.env.DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';
const serviceVersion = process.env.SERVICE_VERSION ?? process.env.npm_package_version;

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
  ...(serviceVersion ? { [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion } : {}),
});

const otlpLogsEndpoint = resolveLogsEndpoint();
const otlpHeaders = parseHeaders(
  process.env.OTEL_EXPORTER_OTLP_LOGS_HEADERS ?? process.env.OTEL_EXPORTER_OTLP_HEADERS ?? ''
);

let logProvider: LoggerProvider | undefined;
let logProcessor: BatchLogRecordProcessor | undefined;
let otelLogger: OtelLogger | undefined;

if (otlpLogsEndpoint) {
  logProvider = new LoggerProvider({ resource });
  const exporter = new OTLPLogExporter({ url: otlpLogsEndpoint, headers: otlpHeaders });
  logProcessor = new BatchLogRecordProcessor(exporter);
  logProvider.addLogRecordProcessor(logProcessor);
  logs.setLoggerProvider(logProvider);
  otelLogger = logProvider.getLogger(serviceName);
}

const sanitizeFormat = format((info: TransformableInfo) => {
  const seen = new WeakSet<object>();
  for (const key of Object.keys(info)) {
    (info as Record<string, unknown>)[key] = sanitizeForLogging((info as Record<string, unknown>)[key], key, seen);
  }
  return info;
});

const baseFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  sanitizeFormat(),
  format.json()
);

const loggerTransports: TransportStream[] = [
  new transports.Console({
    level: process.env.LOG_LEVEL ?? 'info',
    format: format.combine(
      format.timestamp(),
      sanitizeFormat(),
      format.printf((info) => JSON.stringify(info))
    )
  })
];

if (otelLogger) {
  loggerTransports.push(new OpenTelemetryTransport(otelLogger));
}

const loggerInstance: Logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  defaultMeta: {
    service: serviceName,
    environment,
  },
  format: baseFormat,
  transports: loggerTransports,
});

export const logger = loggerInstance;
export default loggerInstance;

export async function flushLogger(): Promise<void> {
  await logProcessor?.forceFlush();
}

export async function shutdownLogger(): Promise<void> {
  await logProvider?.shutdown();
}

export function sanitizeForLogging(value: unknown, key: string = 'root', seen: WeakSet<object> = new WeakSet()): unknown {
  const keyLower = key.toLowerCase();
  if (SENSITIVE_PATTERNS.some((pattern) => keyLower.includes(pattern))) {
    return '[REDACTED]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return '[BUFFER]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeForLogging(item, `${key}[${index}]`, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      return '[Circular]';
    }

    seen.add(value as object);
    const sanitized: Record<string, unknown> = {};

    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[childKey] = sanitizeForLogging(childValue, childKey, seen);
    }

    seen.delete(value as object);
    return sanitized;
  }

  return value;
}

class OpenTelemetryTransport extends TransportStream {
  private readonly otelLogger: OtelLogger;

  constructor(otelLogger: OtelLogger) {
    super({ level: process.env.LOG_LEVEL ?? 'info' });
    this.otelLogger = otelLogger;
  }

  override log(info: TransformableInfo, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    try {
      const data = info as Record<string, unknown>;
      const { level, message, timestamp, ...metadata } = data;
      const attributes = buildLogAttributes(metadata);

      const activeSpan = trace.getSpan(context.active());
      const spanContext = activeSpan?.spanContext();

      if (spanContext) {
        if (spanContext.traceId) {
          attributes['trace.id'] = spanContext.traceId;
        }
        if (spanContext.spanId) {
          attributes['span.id'] = spanContext.spanId;
        }
      }

      if (typeof data.logger === 'string') {
        attributes['log.logger'] = data.logger;
      }

      this.otelLogger.emit({
        severityNumber: mapSeverity(level),
        severityText: typeof level === 'string' ? level.toUpperCase() : undefined,
        body: message,
        attributes,
        timestamp: resolveTimestamp(timestamp),
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- avoid recursive logger usage on failure
      console.error('Failed to export log to OpenTelemetry', error);
    }

    callback();
  }
}

function resolveTimestamp(timestamp: unknown): number {
  if (typeof timestamp === 'number') {
    return Math.trunc(timestamp * 1_000_000);
  }

  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!Number.isNaN(parsed)) {
      return parsed * 1_000_000;
    }
  }

  return Date.now() * 1_000_000;
}

function buildLogAttributes(metadata: Record<string, unknown>): LogAttributes {
  const attributes: LogAttributes = {
    'service.name': serviceName,
    'deployment.environment': environment,
  };

  for (const [metaKey, metaValue] of Object.entries(metadata)) {
    if (metaValue === undefined || metaValue === null) {
      continue;
    }

    if (metaKey === 'service' || metaKey === 'environment') {
      continue;
    }

    if (typeof metaValue === 'string' || typeof metaValue === 'number' || typeof metaValue === 'boolean') {
      attributes[`meta.${metaKey}`] = metaValue;
    } else {
      attributes[`meta.${metaKey}`] = JSON.stringify(metaValue);
    }
  }

  return attributes;
}

function mapSeverity(level: unknown): SeverityNumber {
  switch (typeof level === 'string' ? level.toLowerCase() : '') {
    case 'error':
      return SeverityNumber.ERROR;
    case 'warn':
    case 'warning':
      return SeverityNumber.WARN;
    case 'debug':
    case 'verbose':
      return SeverityNumber.DEBUG;
    case 'silly':
    case 'trace':
      return SeverityNumber.TRACE;
    case 'info':
      return SeverityNumber.INFO;
    default:
      return SeverityNumber.UNSPECIFIED;
  }
}

function resolveLogsEndpoint(): string | undefined {
  const explicit = process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
  if (explicit) {
    return explicit;
  }

  const generic = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!generic) {
    return undefined;
  }

  const normalized = generic.endsWith('/') ? generic.slice(0, -1) : generic;
  return normalized.endsWith('/v1/logs') ? normalized : `${normalized}/v1/logs`;
}

function parseHeaders(value: string): Record<string, string> | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((headers, entry) => {
      const [key, ...rest] = entry.split('=');
      if (key && rest.length) {
        headers[key.trim()] = rest.join('=').trim();
      }
      return headers;
    }, {});
}

const SENSITIVE_PATTERNS = ['password', 'secret', 'token', 'authorization', 'apikey', 'ssn', 'card', 'email'];
