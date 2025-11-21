/**
 * Request Logger Middleware
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export function setupRequestLogger(server: FastifyInstance): void {
  server.addHook('onRequest', async (request: FastifyRequest) => {
    request.log.info({
      method: request.method,
      url: request.url,
      headers: {
        'user-agent': request.headers['user-agent'],
        'x-request-id': request.headers['x-request-id'],
      },
    }, 'Incoming request');
  });

  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });
}
