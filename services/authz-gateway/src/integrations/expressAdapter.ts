import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { authorize } from '../policy';
import { features } from '../config';
import { log } from '../audit';

interface ExpressAdapterOptions {
  action: string;
  buildInput?: (req: Request) => Parameters<typeof authorize>[0];
}

function defaultInputBuilder(req: Request, action: string) {
  const user = (req as Record<string, unknown>).user as
    | Record<string, unknown>
    | undefined;
  const roles = (user?.roles as string[]) || [];
  const tenantId = String(user?.tenantId || req.headers['x-tenant-id'] || '');
  const purpose = String(req.headers['x-purpose'] || '');
  const authority = String(req.headers['x-authority'] || '');
  return {
    user: {
      sub: String(user?.sub || ''),
      tenantId,
      roles,
      ...user,
    },
    resource: {
      path: req.originalUrl,
      tenantId: String(req.headers['x-tenant-id'] || ''),
      attributes: {
        needToKnow: req.headers['x-needtoknow'] || undefined,
      },
    },
    action,
    purpose,
    authority,
  };
}

export function createPolicyMiddleware(
  options: ExpressAdapterOptions,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!features.policyReasoner) {
      return next();
    }
    const input = options.buildInput
      ? options.buildInput(req)
      : defaultInputBuilder(req, options.action);
    const decision = await authorize(input);
    const audit = log({
      subject: String(input.user.sub || 'anonymous'),
      action: options.action,
      resource: JSON.stringify(input.resource),
      tenantId: String(input.user.tenantId || ''),
      decision,
      purpose: input.purpose,
      authority: input.authority,
    });
    res.setHeader('X-Audit-Id', audit.id);
    if (!decision.allowed) {
      return res.status(403).json({
        error: 'forbidden',
        reason: decision.reason,
        policy: decision.policyId,
        appealLink: decision.appealLink,
        appealToken: decision.appealToken,
      });
    }
    (req as Record<string, unknown>).policyDecision = decision;
    return next();
  };
}
