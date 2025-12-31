import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const DEFAULT_SUNSET_FLAG = path.join(process.cwd(), '.sunset_mode');

export const getSunsetFlagPath = () => {
    return process.env.SUNSET_FLAG_PATH || DEFAULT_SUNSET_FLAG;
}

export const sunsetMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Allow read-only methods
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const flagPath = getSunsetFlagPath();

  // Check if sunset mode is active
  if (fs.existsSync(flagPath)) {
    // If active, block write operations
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'System is in Sunset Mode. Write operations are disabled.',
      code: 'SUNSET_MODE_ACTIVE'
    });
    return;
  }

  next();
};
