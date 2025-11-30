/**
 * Policy Middleware
 *
 * Enforces authority binding and reason-for-access requirements.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

declare module 'fastify' {
  interface FastifyRequest {
    authorityId?: string;
    reasonForAccess?: string;
    policyWarnings?: Array<{
      error: string;
      reason: string;
      appealPath: string;
    }>;
  }
}

export async function policyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authorityId = request.headers['x-authority-id'] as string | undefined;
  const reasonForAccess = request.headers['x-reason-for-access'] as string | undefined;

  // Skip policy check for health endpoints
  if (request.url.startsWith('/health')) {
    return;
  }

  if (!authorityId || !reasonForAccess) {
    const isDryRun = config.policyDryRun;

    if (isDryRun) {
      request.policyWarnings = request.policyWarnings || [];
      request.policyWarnings.push({
        error: 'Policy denial',
        reason: 'Missing authority binding or reason-for-access',
        appealPath: '/ombudsman/appeals',
      });

      logger.warn(
        {
          url: request.url,
          method: request.method,
          correlationId: request.correlationId,
        },
        'Policy check failed (dry-run mode)'
      );
      return;
    }

    logger.warn(
      {
        url: request.url,
        method: request.method,
        correlationId: request.correlationId,
      },
      'Policy check failed - access denied'
    );

    return reply.status(403).send({
      error: 'Policy denial',
      reason: 'Missing authority binding or reason-for-access',
      appealPath: '/ombudsman/appeals',
    });
  }

  request.authorityId = authorityId;
  request.reasonForAccess = reasonForAccess;
}
