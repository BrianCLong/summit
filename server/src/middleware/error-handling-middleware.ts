// @ts-nocheck
import type { NextFunction, Request, Response } from 'express';
import { GraphQLError } from 'graphql';
import { z } from 'zod';
const ZodError = z.ZodError;
import { logger } from '../config/logger.js';
import { recordEndpointResult } from '../observability/reliability-metrics.js';

const deriveStatusCode = (error: unknown): number => {
  if (error instanceof GraphQLError) {
    const httpStatus = error.extensions?.http?.status;
    if (typeof httpStatus === 'number') return httpStatus;
  }

  if (error instanceof ZodError) {
    return 400;
  }

  const candidateStatus =
    (error as { statusCode?: number })?.statusCode ??
    (error as { status?: number })?.status;

  if (typeof candidateStatus === 'number') {
    return candidateStatus;
  }

  if ((error as { type?: string })?.type === 'entity.parse.failed') {
    return 400;
  }

  return 500;
};

const normalizeGraphQLError = (error: unknown, statusCode: number): GraphQLError => {
  if (error instanceof GraphQLError) {
    return error;
  }

  const code = statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_USER_INPUT';
  const message = statusCode >= 500 ? 'Internal server error' : 'Invalid request payload';

  return new GraphQLError(message, {
    extensions: {
      code,
      http: { status: statusCode },
    },
  });
};

const deriveMessage = (error: unknown, fallback: string): string => {
  if (error instanceof GraphQLError) {
    return error.message;
  }
  if (error instanceof ZodError) {
    return 'Invalid request payload';
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

export const centralizedErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = deriveStatusCode(err);
  const isGraphQLRoute = req.path?.startsWith('/graphql');
  const graphQLError = isGraphQLRoute
    ? normalizeGraphQLError(err, statusCode)
    : err instanceof GraphQLError
      ? err
      : null;

  const message = deriveMessage(graphQLError ?? err, statusCode >= 500 ? 'Internal server error' : 'Bad request');

  logger.error({
    err,
    path: req.path,
    method: req.method,
    statusCode,
    correlationId: (req as Record<string, unknown>).correlationId,
  }, 'Request failed');

  recordEndpointResult({
    endpoint: req.path,
    statusCode,
    durationSeconds: (res.locals.duration as number) || 0,
    tenantId: (req as { user?: { tenantId?: string }; tenantId?: string }).tenantId ||
      (req as { user?: { tenantId?: string } }).user?.tenantId ||
      'unknown',
  });

  const responseBody: Record<string, unknown> = {
    error: {
      message,
      code: graphQLError?.extensions?.code,
      correlationId:
        (req as Record<string, unknown>).correlationId ||
        req.headers['x-correlation-id'] ||
        req.headers['x-request-id'],
    },
  };

  if (graphQLError?.extensions?.details && process.env.NODE_ENV !== 'production') {
    (responseBody.error as Record<string, unknown>).details = graphQLError.extensions.details;
  }

  res.status(statusCode).json(responseBody);
};
