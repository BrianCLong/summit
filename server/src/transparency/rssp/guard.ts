import { NextFunction, Request, Response } from 'express';

const ALLOWED_POST_PATHS = new Set(['/verify']);

export function regulatorOnlyGuard(req: Request, res: Response, next: NextFunction) {
  const role = (req.headers['x-rssp-role'] || req.headers['x-rssp-roles']) as string | undefined;
  if (!role || !role.toLowerCase().split(',').includes('regulator')) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Regulator credentials required for RSSP portal access.',
    });
  }

  if (req.method === 'POST') {
    const normalizedPath = req.path.endsWith('/') && req.path.length > 1 ? req.path.slice(0, -1) : req.path;
    if (!ALLOWED_POST_PATHS.has(normalizedPath)) {
      return res.status(405).json({
        error: 'method_not_allowed',
        message: 'RSSP portal is read-only; mutation endpoints are disabled.',
      });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS' && req.method !== 'POST') {
    return res.status(405).json({
      error: 'method_not_allowed',
      message: 'RSSP portal only supports read-only operations.',
    });
  }

  return next();
}
