import { Request, Response, NextFunction } from 'express';

export const tenantContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const tenantId = req.header('x-tenant-id');
  if (tenantId) {
    (req as any).tenantId = tenantId;
  }
  next();
};

export default tenantContextMiddleware;
