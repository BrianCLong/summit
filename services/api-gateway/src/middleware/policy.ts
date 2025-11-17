import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface PolicyOptions {
  dryRun?: boolean;
}

export interface PolicyDenial {
  error: string;
  reason: string;
  appealPath: string;
}

/**
 * Enforces warrant/authority binding and reason-for-access.
 * In dry-run mode, annotates response warnings instead of blocking.
 */
export function policyGuard({ dryRun = false }: PolicyOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers['x-authority-id'] as string;
    const reason = req.headers['x-reason-for-access'] as string;

    if (!auth || !reason) {
      const denial: PolicyDenial = {
        error: 'Policy denial',
        reason: 'Missing authority binding or reason-for-access headers',
        appealPath: '/ombudsman/appeals',
      };

      logger.warn('Policy violation', {
        path: req.path,
        method: req.method,
        missingAuth: !auth,
        missingReason: !reason,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      if (dryRun) {
        // Annotate request with policy warnings
        (req as any).__policyWarnings = [
          (req as any).__policyWarnings || [],
          denial,
        ].flat();
        logger.warn('Policy dry-run: would have blocked request', denial);
        return next();
      }

      return res.status(403).json(denial);
    }

    // Store policy context
    (req as any).authorityId = auth;
    (req as any).reasonForAccess = reason;

    logger.info('Policy check passed', {
      authorityId: auth,
      reasonForAccess: reason,
      path: req.path,
    });

    next();
  };
}
