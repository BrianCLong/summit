import { jwtVerify, type JWTPayload } from 'jose';
import { getPublicKey } from './keys';
import { authorize, type PolicyInput } from './policy';
import { log } from './audit';
import type { Request, Response, NextFunction } from 'express';

interface Options {
  action: string;
  requiredAcr?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

function buildPolicyInput(
  req: AuthenticatedRequest,
  user: JWTPayload,
  action: string,
): PolicyInput {
  const purpose = String(req.headers['x-purpose'] || '');
  const authority = String(req.headers['x-authority'] || '');
  const tenantHeader = String(req.headers['x-tenant-id'] || '');
  const needToKnow = String(req.headers['x-needtoknow'] || '');
  return {
    user: {
      sub: String(user.sub || ''),
      tenantId: String(user.tenantId || ''),
      roles: (user.roles as string[]) || [],
      ...user,
    },
    resource: {
      path: req.originalUrl || req.path,
      tenantId: tenantHeader,
      attributes: {
        needToKnow: needToKnow || undefined,
      },
      needToKnow,
    },
    action,
    purpose,
    authority,
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
      const policyInput = buildPolicyInput(req, payload, options.action);
      const decision = await authorize(policyInput);
      const auditRecord = log({
        subject: String(payload.sub || 'anonymous'),
        action: options.action,
        resource: JSON.stringify(policyInput.resource),
        tenantId: String(payload.tenantId || ''),
        decision,
        purpose: policyInput.purpose,
        authority: policyInput.authority,
      });
      res.setHeader('X-Audit-Id', auditRecord.id);
      if (!decision.allowed) {
        return res.status(403).json({
          error: 'forbidden',
          reason: decision.reason,
          policy: decision.policyId,
          appealLink: decision.appealLink,
          appealToken: decision.appealToken,
        });
      }
      req.user = payload;
      req.headers['x-purpose'] = policyInput.purpose;
      req.headers['x-authority'] = policyInput.authority;
      return next();
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
