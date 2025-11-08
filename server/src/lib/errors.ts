import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { z } from 'zod';

const logger = pino({ name: 'ErrorMapper' });

export class UserFacingError extends Error {
  statusCode: number;
  traceId: string;

  constructor(message: string, statusCode: number, traceId: string) {
    super(message);
    this.statusCode = statusCode;
    this.traceId = traceId;
  }
}

export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export function mapGraphRAGError(error: unknown): UserFacingError {
  const traceId = randomUUID();
  let summary = 'Unknown error';
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
    summary = (error as any).issues
      .map((i: any) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
  } else if (error instanceof Error) {
    summary = error.message;
  }
  logger.warn(
    { traceId, issues: summary },
    'GraphRAG schema validation failed',
  );
  return new UserFacingError(
    `Invalid GraphRAG response. Trace ID: ${traceId}`,
    400,
    traceId,
  );
}
