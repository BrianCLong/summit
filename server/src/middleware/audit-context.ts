/**
 * Audit Context Middleware
 * Extracts tenant, user, and request context for audit logging
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Extended request interface with audit context
 */
export interface AuditContextRequest extends Request {
  auditContext: {
    tenantId: string;
    userId: string;
    requestId: string;
    sessionId?: string;
    correlationId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Middleware to extract and attach audit context to requests
 */
export function auditContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auditReq = req as AuditContextRequest;

  // Extract tenant ID from headers
  const tenantId = String(
    req.headers['x-tenant-id'] ||
      req.headers['x-tenant'] ||
      (req as any).user?.tenantId ||
      '',
  );

  // Extract user ID from various sources
  const userId = String(
    (req as any).user?.id ||
      (req as any).user?.sub ||
      req.headers['x-user-id'] ||
      (req as any).user?.email ||
      'anonymous',
  );

  // Generate or extract request/correlation IDs
  const requestId = String(
    req.headers['x-request-id'] || randomUUID(),
  );
  const correlationId = String(
    req.headers['x-correlation-id'] || req.headers['x-trace-id'] || '',
  ) || undefined;
  const sessionId = String(req.headers['x-session-id'] || '') || undefined;

  // Attach audit context
  auditReq.auditContext = {
    tenantId,
    userId,
    requestId,
    sessionId,
    correlationId,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };

  // Set request ID in response headers for tracing
  res.setHeader('x-request-id', requestId);
  if (correlationId) {
    res.setHeader('x-correlation-id', correlationId);
  }

  next();
}

/**
 * Helper to get audit context from request
 */
export function getAuditContext(req: Request): AuditContextRequest['auditContext'] | null {
  const auditReq = req as AuditContextRequest;
  return auditReq.auditContext || null;
}

/**
 * Helper to require tenant ID
 */
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const context = getAuditContext(req);

  if (!context?.tenantId) {
    res.status(400).json({
      error: 'tenant_required',
      message: 'X-Tenant-ID header is required',
    });
    return;
  }

  next();
}

/**
 * Helper to require authenticated user
 */
export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const context = getAuditContext(req);

  if (!context?.userId || context.userId === 'anonymous') {
    res.status(401).json({
      error: 'user_required',
      message: 'Authentication is required',
    });
    return;
  }

  next();
}

export default auditContextMiddleware;
