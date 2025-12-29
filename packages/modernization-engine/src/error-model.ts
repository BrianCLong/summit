import { randomUUID } from 'crypto';
import { ErrorEnvelope } from './types.js';
import { ValidationError } from './errors.js';

export function createErrorEnvelope(
  domain: string,
  code: string,
  message: string,
  options: {
    boundary?: 'internal' | 'external';
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    correlationId?: string;
    retryable?: boolean;
    cause?: string;
    details?: Record<string, unknown>;
  } = {},
): ErrorEnvelope {
  if (!code || !message) {
    throw new ValidationError('Error envelope requires code and message');
  }
  const boundary = options.boundary ?? 'internal';
  const severity = options.severity ?? 'MEDIUM';
  const correlationId = options.correlationId ?? randomUUID();
  const retryable = options.retryable ?? false;

  return {
    code,
    message,
    domain,
    boundary,
    severity,
    correlationId,
    timestamp: new Date().toISOString(),
    retryable,
    cause: options.cause,
    details: options.details,
  };
}

export function isErrorEnvelope(payload: unknown): payload is ErrorEnvelope {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Partial<ErrorEnvelope>;
  return Boolean(
    candidate.code &&
      candidate.message &&
      candidate.domain &&
      candidate.boundary &&
      candidate.severity &&
      candidate.correlationId &&
      candidate.timestamp,
  );
}
