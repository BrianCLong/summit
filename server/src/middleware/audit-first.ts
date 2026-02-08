import { Request, Response, NextFunction } from 'express';
import { provenanceLedger } from '../provenance/ledger.js';
import { logger } from '../config/logger.js';

const middlewareLogger = logger.child({ name: 'AuditFirstMiddleware' });

// Define sensitive paths that should always be audited regardless of method
const SENSITIVE_PATHS = [
  '/auth',
  '/disclosures',
  '/api/compliance',
  '/api/provenance',
  '/api/keys',
  '/rbac',
];

// Define sensitive methods
const SENSITIVE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

function isSensitive(req: Request): boolean {
  if (SENSITIVE_METHODS.includes(req.method)) {
    return true;
  }

  // Check path prefixes
  const path = req.path.toLowerCase();
  if (SENSITIVE_PATHS.some((p) => path.startsWith(p))) {
    return true;
  }

  return false;
}

function redactPayload(body: any): any {
  if (!body) return body;
  if (typeof body !== 'object') return body;

  if (Array.isArray(body)) {
    return body.map((item) => redactPayload(item));
  }

  const redacted = { ...body };
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'accessToken', 'refreshToken'];

  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactPayload(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Audit-First Middleware
 * 
 * Captures sensitive operations and stamps them into the non-repudiable Provenance Ledger.
 */
export function auditFirstMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only process if it's a sensitive operation
  if (!isSensitive(req)) {
    return next();
  }

  const start = Date.now();

  // We capture the log on finish to ensure we have the outcome (status code)
  res.on('finish', async () => {
    try {
      const user = (req as any).user;
      const tenantId =
        user?.tenantId ||
        user?.tenant_id ||
        (req as any).tenantId ||
        (req as any).tenant?.id ||
        req.headers['x-tenant-id']?.toString() ||
        'unknown-tenant';

      const userId = user?.id || user?.sub || 'anonymous';
      const duration = Date.now() - start;

      // Prepare payload
      const payload = {
        method: req.method,
        path: req.path,
        query: req.query,
        body: redactPayload(req.body),
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      };

      // Append to Provenance Ledger
      await (provenanceLedger as any).appendEntry({
        tenantId,
        timestamp: new Date(),
        actionType: `API_${req.method}`,
        resourceType: 'API_ROUTE',
        resourceId: req.path,
        actorId: userId,
        actorType: user ? 'user' : 'system',
        payload: payload as any,
        metadata: {
          requestId: (req as any).id || (req.headers['x-request-id'] as string) || (req as any).correlationId,
          correlationId: (req as any).correlationId || (req.headers['x-correlation-id'] as string),
          sessionId: (req as any).sessionID || (req as any).session?.id,
          traceId: (req as any).traceId,
        },
      });

      middlewareLogger.debug(
        { path: req.path, method: req.method, tenantId, userId, duration },
        'Sensitive operation stamped in Provenance Ledger'
      );
    } catch (error: any) {
      middlewareLogger.error(
        { error: error instanceof Error ? error.message : String(error), path: req.path },
        'Failed to stamp audit event in middleware'
      );
    }
  });

  next();
}
