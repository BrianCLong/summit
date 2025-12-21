import { stdSerializers } from 'pino';
import type { LogEvent, LogLevel } from './logEventBus.js';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
  'apiKey',
  'apikey',
  'ssn',
  'card',
  'cardnumber',
  'x-api-key',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const isRequestLike = (value: unknown): value is { method: string; url?: string; headers?: Record<string, string>; socket?: unknown } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'method' in value &&
    typeof (value as any).method === 'string' &&
    'headers' in value
  );
};

const isResponseLike = (value: unknown): value is { statusCode?: number; getHeader?: (key: string) => unknown } => {
  return typeof value === 'object' && value !== null && 'statusCode' in value;
};

const redactValue = (value: unknown, seen: WeakSet<object>): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return undefined;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value
      .map((entry) => redactValue(entry, seen))
      .filter((entry) => entry !== undefined);
  }

  if (value instanceof Error) {
    return stdSerializers.err(value);
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, val]) => {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      return acc;
    }

    const redacted = redactValue(val, seen);
    if (redacted !== undefined) {
      acc[key] = redacted;
    }

    return acc;
  }, {});
};

const serialize = (value: unknown): Record<string, unknown> => {
  if (value instanceof Error) return { error: stdSerializers.err(value) };

  if (isRequestLike(value)) {
    const req = value as any;
    return {
      req: {
        id: req.id ?? req.headers?.['x-request-id'],
        method: req.method,
        url: req.url,
        remoteAddress: req.socket?.remoteAddress,
      },
    };
  }

  if (isResponseLike(value)) {
    const res = value as any;
    return {
      res: {
        statusCode: res.statusCode,
        contentLength: typeof res.getHeader === 'function' ? res.getHeader('content-length') : undefined,
      },
    };
  }

  if (isPlainObject(value)) {
    return redactValue(value, new WeakSet()) ?? {};
  }

  return { value };
};

const extractMessage = (first: unknown, rest: unknown[]): string => {
  if (typeof first === 'string') return first;

  const firstStringInRest = rest.find((entry) => typeof entry === 'string');
  if (typeof firstStringInRest === 'string') return firstStringInRest;

  if (isPlainObject(first) && typeof (first as any).message === 'string') {
    return (first as any).message;
  }

  return 'log';
};

export const formatLogEvent = (level: LogLevel, args: unknown[]): LogEvent => {
  const [first, ...rest] = args;

  const contextParts: Record<string, unknown>[] = [];

  const addContext = (value: unknown) => {
    const serialized = serialize(value);
    if (serialized && Object.keys(serialized).length > 0) {
      contextParts.push(serialized);
    }
  };

  if (first !== undefined) addContext(first);
  rest.forEach((value) => {
    if (value && typeof value === 'object') addContext(value);
  });

  const mergedContext = Object.assign({}, ...contextParts);

  return {
    level,
    message: extractMessage(first, rest),
    timestamp: new Date().toISOString(),
    correlationId: (mergedContext.correlationId as string) ?? undefined,
    traceId: (mergedContext.traceId as string) ?? undefined,
    spanId: (mergedContext.spanId as string) ?? undefined,
    tenantId: (mergedContext.tenantId as string) ?? undefined,
    userId: (mergedContext.userId as string) ?? undefined,
    service: (mergedContext.service as string) ?? 'summit-api',
    context: mergedContext,
  };
};

export const redactSensitive = (value: unknown): unknown => redactValue(value, new WeakSet());
export const isRequest = isRequestLike;
export const isResponse = isResponseLike;
