/**
 * Global Error Handler Middleware
 */

import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function setupErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = request.id;

      // Zod validation errors
      if (error instanceof ZodError) {
        const response: ApiError = {
          statusCode: 400,
          error: 'Validation Error',
          message: 'Request validation failed',
          details: error.flatten(),
          requestId,
        };
        return reply.status(400).send(response);
      }

      // Application errors
      if (error instanceof AppError) {
        const response: ApiError = {
          statusCode: error.statusCode,
          error: error.name,
          message: error.message,
          details: error.details,
          requestId,
        };
        return reply.status(error.statusCode).send(response);
      }

      // Fastify errors (like 404)
      if ('statusCode' in error && typeof error.statusCode === 'number') {
        const response: ApiError = {
          statusCode: error.statusCode,
          error: error.name || 'Error',
          message: error.message,
          requestId,
        };
        return reply.status(error.statusCode).send(response);
      }

      // Unknown errors
      server.log.error(error, 'Unhandled error');
      const response: ApiError = {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        requestId,
      };
      return reply.status(500).send(response);
    },
  );

  // Handle 404s
  server.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const response: ApiError = {
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      requestId: request.id,
    };
    return reply.status(404).send(response);
  });
}
