import crypto from 'crypto';
import { RequestHandler } from 'express';
import { securityLogger } from '../observability/securityLogger.js';
import { resolveTenantId } from './tenant.js';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
export const CSRF_HEADER = 'x-csrf-token';

export const issueCsrfToken: RequestHandler = (req, res) => {
  if (!req.session) {
    return res.status(500).json({ error: 'Session not initialized' });
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  return res.json({ token: req.session.csrfToken });
};

const shouldVerify = (method: string, path: string): boolean => {
  if (SAFE_METHODS.includes(method.toUpperCase())) return false;
  if (path.startsWith('/security/csrf-token')) return false;
  return true;
};

export const csrfProtector: RequestHandler = (req, res, next) => {
  if (!shouldVerify(req.method, req.path)) {
    return next();
  }

  const token = (req.headers[CSRF_HEADER] as string | undefined) || undefined;
  if (!req.session || !req.session.csrfToken || !token) {
    securityLogger.logEvent('csrf_violation', {
      level: 'warn',
      tenant: resolveTenantId(req),
      path: req.originalUrl,
    });
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  if (token !== req.session.csrfToken) {
    securityLogger.logEvent('csrf_violation', {
      level: 'warn',
      tenant: resolveTenantId(req),
      path: req.originalUrl,
      message: 'Mismatched CSRF token',
    });
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  return next();
};

