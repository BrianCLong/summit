import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { ZodError, z } from 'zod';

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

export function mapGraphRAGError(error: unknown): UserFacingError {
  const traceId = randomUUID();
  let summary = 'Unknown error';
  if (error instanceof z.ZodError) {
    summary = error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
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
