import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireMtls } from '../security/mtls';

export async function ZeroTrustGuard(req: Request, res: Response, next: NextFunction) {
  try {
    requireMtls((req.socket as any).getPeerCertificate());
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new Error('jwt_required');
    const token = auth.slice(7);
    const decoded = jwt.decode(token) as any;
    const tenantId = decoded?.tenantId;
    if (!tenantId) throw new Error('tenant_required');
    (req as any).tenantId = tenantId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'unauthorized' });
  }
}
