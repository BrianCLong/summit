import { Request, Response, NextFunction } from 'express';
import { productionAuthMiddleware } from '../config/production-security.js';
import { cfg } from '../config.js';

export const ensureAgentSessionExplorerEnabled = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!cfg.AGENT_SESSION_EXPLORER_ENABLED) {
    return res.status(404).json({ error: 'Agent session explorer is disabled' });
  }
  return next();
};

export const requireAgentSessionAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (cfg.NODE_ENV === 'production') {
    return productionAuthMiddleware(req, res, next);
  }

  if ((req as any).user) return next();
  if (process.env.ENABLE_INSECURE_DEV_AUTH === 'true') {
    (req as any).user = { sub: 'dev-user', role: 'admin' };
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Best-effort token presence check; full verification is handled in production middleware
  (req as any).user = { sub: 'token-user', role: 'admin', token };
  return next();
};

export const requireAgentSessionAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const role = (req as any).user?.role;
  if (role && !['admin', 'superadmin', 'owner'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};

