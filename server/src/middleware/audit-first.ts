import { Request, Response, NextFunction } from 'express';
import { provenanceLedger } from '../provenance/ledger.js';
import logger from '../config/logger.js';

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
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];

  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactPayload(redacted[key]);
    }
  }

  return redacted;
}

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
        req.headers['x-tenant-id'] ||
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
      await provenanceLedger.appendEntry({
        tenantId,
        actionType: `API_${req.method}`,
        resourceType: 'API_ROUTE',
        resourceId: req.path,
        actorId: userId,
        actorType: user ? 'user' : 'system', // or 'unknown'
        payload,
        metadata: {
          requestId: (req as any).id || req.headers['x-request-id'],
          correlationId: (req as any).correlationId || req.headers['x-correlation-id'],
          sessionId: (req as any).sessionID,
        },
      });

      middlewareLogger.debug(
        { path: req.path, method: req.method, tenantId, userId },
        'Sensitive operation stamped in Provenance Ledger'
      );
    } catch (error) {
      middlewareLogger.error(
        { error: (error as Error).message, path: req.path },
        'Failed to stamp audit event in middleware'
      );
      // Note: We don't block the response here as it's already finished,
      // but in a strict "Audit-First" mode we might want to fail the request if audit fails.
      // Since we are in on('finish'), the response is already sent.
    }
  });

  next();
}
