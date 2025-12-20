import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { z } from 'zod';

const logger = pino({ name: 'ErrorMapper' });

/**
 * Represents an error that is safe to be exposed to the user.
 * Includes a status code and a trace ID for debugging.
 */
export class UserFacingError extends Error {
  statusCode: number;
  traceId: string;

  /**
   * @param message - The error message to show to the user.
   * @param statusCode - The HTTP status code associated with the error.
   * @param traceId - A unique identifier for tracing the error log.
   */
  constructor(message: string, statusCode: number, traceId: string) {
    super(message);
    this.statusCode = statusCode;
    this.traceId = traceId;
  }
}

/**
 * Base class for application-specific errors.
 * Used for internal error handling logic.
 */
export class AppError extends Error {
  statusCode: number;
  code?: string;

  /**
   * @param message - The internal error message.
   * @param statusCode - The HTTP status code (default: 500).
   * @param code - An optional error code string.
   */
  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

/**
 * Maps internal errors (specifically from GraphRAG validation) to UserFacingErrors.
 * Logs the internal details and returns a sanitized error for the client.
 *
 * @param error - The unknown error object caught during execution.
 * @returns A UserFacingError with a unique trace ID.
 */
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
