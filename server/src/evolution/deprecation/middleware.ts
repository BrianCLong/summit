import { Request, Response, NextFunction } from 'express';
import { registry } from './DeprecationRegistry.js';

export const deprecationMiddleware = (componentId: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract override token from headers
    const overrideToken = req.headers['deprecation-override-token'] as string | undefined;

    // Check status with token
    const status = registry.checkStatus(componentId, overrideToken);

    if (status.headers) {
      Object.entries(status.headers).forEach(([key, value]) => {
        if (value) res.setHeader(key, value);
      });
    }

    if (!status.allowed) {
      res.status(410).json({
        error: 'Gone',
        message: status.message,
      });
      return;
    }

    next();
  };
};
