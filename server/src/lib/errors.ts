import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { z } from 'zod';

const logger = pino({ name: 'ErrorMapper' });

/**
 * Represents an error that is safe to expose to the user.
 * Includes a status code and a trace ID for debugging.
 */
export class UserFacingError extends Error {
  /** HTTP status code associated with the error. */
  statusCode: number;
  /** Unique trace ID for debugging purposes. */
  traceId: string;

  /**
   * Creates a new UserFacingError.
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code.
   * @param {string} traceId - The unique trace ID for this error.
   */
  constructor(message: string, statusCode: number, traceId: string) {
    super(message);
    this.statusCode = statusCode;
    this.traceId = traceId;
  }
}

/**
 * Represents a generic application error.
 */
export class AppError extends Error {
  /** HTTP status code associated with the error. */
  statusCode: number;
  /** Optional application-specific error code. */
  code?: string;

  /**
   * Creates a new AppError.
   * @param {string} message - The error message.
   * @param {number} [statusCode=500] - The HTTP status code.
   * @param {string} [code] - An optional error code string.
   */
  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

/**
 * Maps an unknown error (likely from GraphRAG or Zod validation) to a UserFacingError.
 * Logs the detailed error internally and returns a sanitized error for the user.
 *
 * @param {unknown} error - The error to map.
 * @returns {UserFacingError} The sanitized user-facing error.
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
