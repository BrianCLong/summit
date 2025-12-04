import type { Request } from 'express';
import { logger } from '../utils/logger.js';

const log = logger.child({ module: 'context' });

export interface GraphQLContext {
  userId: string;
  userEmail?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create GraphQL context from Express request.
 * Extracts user information from headers (typically set by auth middleware).
 */
export async function createContext({
  req,
}: {
  req: Request;
}): Promise<GraphQLContext> {
  // Extract user info from headers (set by upstream auth)
  const userId = getHeader(req, 'x-user-id') || 'anonymous';
  const userEmail = getHeader(req, 'x-user-email');
  const tenantId = getHeader(req, 'x-tenant-id');

  // Get client info
  const ipAddress =
    getHeader(req, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    undefined;
  const userAgent = getHeader(req, 'user-agent');

  log.debug(
    { userId, tenantId, ipAddress },
    'Created GraphQL context',
  );

  return {
    userId,
    userEmail,
    tenantId,
    ipAddress,
    userAgent,
  };
}

function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
