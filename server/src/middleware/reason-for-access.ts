import { Request, Response, NextFunction } from 'express';
import { GraphQLError } from 'graphql';
import { writeAudit } from '../utils/audit.js';

export interface ReasonForAccessConfig {
  /** Feature flag toggle */
  enabled: boolean;
  /** Minimum characters required for the reason */
  minLength?: number;
  /** Routes (prefix match) that require a reason header */
  sensitiveRoutes: string[];
}

const DEFAULT_MIN_LENGTH = 8;
const HEADER_NAME = 'x-reason-for-access';

function isSensitiveRoute(path: string, prefixes: string[]): boolean {
  const lower = path.toLowerCase();
  return prefixes.some((p) => lower.startsWith(p.toLowerCase()));
}

export function createReasonForAccessMiddleware(config: ReasonForAccessConfig) {
  const minLength = config.minLength ?? DEFAULT_MIN_LENGTH;
  const sensitiveRoutes = config.sensitiveRoutes.map((p) => p.toLowerCase());

  return async function reasonForAccess(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!config.enabled) return next();

    if (!isSensitiveRoute(req.path, sensitiveRoutes)) return next();

    const reason = (req.headers[HEADER_NAME] as string) || '';

    if (!reason) {
      return next(new GraphQLError('X-Reason-For-Access header is required for this endpoint', {
        extensions: { code: 'FORBIDDEN' },
      }));
    }

    if (reason.trim().length < minLength) {
      return next(
        new GraphQLError(
          `X-Reason-For-Access must be at least ${minLength} characters for sensitive endpoints`,
          { extensions: { code: 'FORBIDDEN' } }
        ),
      );
    }

    (req as any).reasonForAccess = reason.trim();

    // Emit audit event (fire-and-forget)
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const tenantId = (req as any).user?.tenant || (req as any).user?.tenantId;
    const requestId = (req as any).reqId || req.headers['x-request-id'];
    const legalBasis = req.headers['x-legal-basis'] as string | undefined;

    writeAudit({
      userId,
      action: 'REASON_FOR_ACCESS_PROVIDED',
      resourceType: 'http',
      resourceId: req.path,
      details: {
        reasonForAccess: reason.trim(),
        legalBasis: legalBasis || null,
        method: req.method,
        requestId: requestId || null,
        tenantId: tenantId || null,
      },
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
    }).catch(() => {
      // non-blocking audit failure
    });

    return next();
  };
}

export const defaultReasonForAccessMiddleware = createReasonForAccessMiddleware({
  enabled: process.env.REASON_FOR_ACCESS === '1',
  sensitiveRoutes: ['/api/provenance', '/api/compliance', '/api/keys', '/api/cases', '/graphql'],
});
