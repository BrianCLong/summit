import axios from 'axios';
import config from 'config';
import type { NextFunction, Request, Response } from 'express';

const defaultOpaUrl = 'http://opa:8181/v1/data/companyos/authz/customer/allow';

const opaUrl = process.env.OPA_URL ?? (config.has('opa.url') ? config.get<string>('opa.url') : defaultOpaUrl);

function logInfo(req: Request, message: string, payload: Record<string, unknown>) {
  const logger = (req as any).log ?? (req as any).logger;
  if (logger?.info) {
    logger.info(payload, message);
  }
}

function logError(req: Request, message: string, payload: Record<string, unknown>) {
  const logger = (req as any).log ?? (req as any).logger;
  if (logger?.error) {
    logger.error(payload, message);
  }
}

export async function authorizeCustomerRead(req: Request, res: Response, next: NextFunction) {
  const subject = (req as any).user ?? {};
  const resource = {
    type: 'customer',
    tenant_id: req.params.tenantId,
    region: req.params.region
  };

  const input = { subject, resource, action: 'read' };

  try {
    const { data } = await axios.post<{ result: boolean }>(opaUrl ?? defaultOpaUrl, { input });

    if (!data.result) {
      logInfo(req, 'authz_denied', { subject_id: (subject as any).id, resource, action: 'read', decision: 'deny' });
      return res.status(403).json({ error: 'forbidden' });
    }

    logInfo(req, 'authz_allowed', { subject_id: (subject as any).id, resource, action: 'read', decision: 'allow' });
    return next();
  } catch (err) {
    logError(req, 'authz_error', { err });
    return res.status(503).json({ error: 'authorization_unavailable' });
  }
}
