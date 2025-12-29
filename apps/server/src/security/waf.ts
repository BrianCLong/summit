import { RequestHandler } from 'express';
import { securityLogger } from '../observability/securityLogger.js';
import { resolveTenantId } from './tenant.js';

const blockedIndicators = [
  /169\.254\.169\.254/i,
  /latest\/meta-data/i,
  /file:\/\//i,
  /\b(eval|__proto__|process\.)/i,
  /\.\.\//,
];

const hasBlockedIndicator = (value: string): boolean =>
  blockedIndicators.some((pattern) => pattern.test(value));

export const wafShield: RequestHandler = (req, res, next) => {
  const candidateStrings: string[] = [req.originalUrl, req.ip || ''];

  if (typeof req.headers['user-agent'] === 'string') {
    candidateStrings.push(req.headers['user-agent']);
  }

  if (typeof req.body === 'string') {
    candidateStrings.push(req.body);
  } else if (req.body && typeof req.body === 'object') {
    candidateStrings.push(JSON.stringify(req.body));
  }

  const blocked = candidateStrings.some((value) => hasBlockedIndicator(value));

  if (blocked) {
    securityLogger.logEvent('waf_block', {
      level: 'warn',
      tenant: resolveTenantId(req),
      path: req.originalUrl,
    });
    return res.status(403).json({ error: 'Request blocked by security policy' });
  }

  return next();
};

