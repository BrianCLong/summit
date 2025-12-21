import { Writable } from 'node:stream';

import { context, trace } from '@opentelemetry/api';
import pino, {
  type DestinationStream,
  type Level,
  type Logger as PinoLogger,
  type LoggerOptions,
  type TransportMultiOptions,
} from 'pino';

import { getLogContext } from './context.js';

export type StructuredLogger = PinoLogger;

export interface LoggerCreateOptions {
  serviceName?: string;
  environment?: string;
  level?: LoggerOptions['level'];
  redactKeys?: string[];
  transport?: TransportMultiOptions;
  destination?: DestinationStream | Writable;
  sampleRates?: Partial<Record<'trace' | 'debug' | 'info' | 'warn', number>>;
  onLog?: (level: Level, args: unknown[]) => void;
}

function buildBaseOptions(options: LoggerCreateOptions): LoggerOptions {
  const { serviceName, environment, level, redactKeys } = options;

  return {
    level: level ?? process.env.LOG_LEVEL ?? 'info',
    base: {
      service: serviceName ?? process.env.SERVICE_NAME ?? 'summit',
      environment: environment ?? process.env.NODE_ENV ?? 'development',
      version: process.env.npm_package_version,
      hostname: process.env.HOSTNAME,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'token',
        'secret',
        'api_key',
        ...(redactKeys ?? []),
      ],
      remove: true,
    },
    hooks: {
      logMethod(args, method, levelLabel) {
        const sampleRate = options.sampleRates?.[levelLabel as keyof LoggerCreateOptions['sampleRates']] ?? 1;
        if (sampleRate < 1 && Math.random() > sampleRate) {
          return;
        }

        const [first, ...rest] = args as [Record<string, unknown> | string, ...unknown[]];
        const activeSpan = trace.getSpan(context.active());
        const spanContext = activeSpan?.spanContext();
        const contextFields = {
          ...getLogContext(),
          traceId: spanContext?.traceId,
          spanId: spanContext?.spanId,
        };

        const finalArgs =
          typeof first === 'object' && !Array.isArray(first)
            ? [{ ...contextFields, ...first }, ...rest]
            : [contextFields, first, ...rest];

        options.onLog?.(levelLabel as Level, finalArgs);
        method.apply(this, finalArgs);
      },
    },
  } satisfies LoggerOptions;
}

function buildTransport(options: LoggerCreateOptions) {
  if (options.transport) {
    return options.transport;
  }

  if (options.destination) {
    return options.destination;
  }

  return pino.transport({
    targets: [
      {
        level: options.level ?? process.env.LOG_LEVEL ?? 'info',
        target: 'pino/file',
        options: { destination: 1 },
      },
    ],
  });
}

export function createLogger(options: LoggerCreateOptions = {}): StructuredLogger {
  const baseOptions = buildBaseOptions(options);
  const destination = buildTransport(options);

  return pino(baseOptions, destination as any);
}

export function createChildLogger(
  logger: StructuredLogger,
  bindings: Record<string, unknown>,
): StructuredLogger {
  return logger.child(bindings);
}
