import { Request, Response, NextFunction } from 'express';

export const apiVersionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const version = req.headers['x-ig-api-version'] as string;

  if (version) {
    (req as any).apiVersion = version;

    // Add logic here to handle version-specific behavior or validation
    if (version === '1.1') {
      // API v1.1 persistent query optimization hints (Sprint 31 E3 S2)
      // Clients on v1.1 support rewrite hints for legacy queries
      res.setHeader('X-IG-Rewrite-Hint', 'true');
    }
  } else {
    // Default version
    (req as any).apiVersion = '1.0';
  }

  next();
};
