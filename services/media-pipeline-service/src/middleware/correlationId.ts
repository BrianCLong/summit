/**
 * Correlation ID Middleware
 *
 * Ensures every request has a correlation ID for tracing.
 */

import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { generateId } from '../utils/hash.js';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export async function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const correlationId =
    (request.headers['x-correlation-id'] as string) || generateId();

  request.correlationId = correlationId;
  reply.header('X-Correlation-Id', correlationId);
}
