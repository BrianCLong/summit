import { jwtVerify, type JWTPayload } from 'jose';
import { getPublicKey } from './keys';
import { authorize } from './policy';
import { log } from './audit';
import type { Request, Response, NextFunction } from 'express';

interface Options {
  action: string;
  requiredAcr?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload & {
    purpose?: string;
    tenantId?: string;
    roles?: string[];
  };
}

export function requireAuth(options: Options) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'missing_token' });
    }
    try {
      const token = auth.replace('Bearer ', '');
      const { payload } = await jwtVerify(token, getPublicKey());
      if (options.requiredAcr && payload.acr !== options.requiredAcr) {
        return res
          .status(401)
          .set('WWW-Authenticate', `acr=${options.requiredAcr}`)
          .json({ error: 'step_up_required' });
      }
      const purposeHeader = String(
        req.headers['x-purpose'] || payload.purpose || '',
      );
      if (!purposeHeader) {
        return res.status(400).json({ error: 'purpose_required' });
      }
      const resource = {
        tenantId: String(req.headers['x-tenant-id'] || ''),
        needToKnow: String(req.headers['x-needtoknow'] || ''),
      };
      if (!resource.tenantId) {
        resource.tenantId = String(payload.tenantId || '');
      }
      if (!resource.tenantId) {
        return res.status(400).json({ error: 'tenant_required' });
      }
      const { allowed, reason } = await authorize(
        {
          tenantId: String(payload.tenantId),
          roles: (payload.roles as string[]) || [],
          purpose: purposeHeader,
        },
        resource,
        options.action,
      );
      await log({
        subject: String(payload.sub),
        action: options.action,
        resource: JSON.stringify(resource),
        tenantId: String(payload.tenantId),
        purpose: purposeHeader,
        allowed,
        reason,
      });
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }
      req.user = { ...payload, purpose: purposeHeader };
      req.headers['x-tenant-id'] = resource.tenantId;
      req.headers['x-purpose'] = purposeHeader;
      return next();
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
