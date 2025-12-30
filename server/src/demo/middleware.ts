/**
 * @file server/src/demo/middleware.ts
 * @description Express middleware to enforce Demo Mode hard gate.
 */

import { Request, Response, NextFunction } from 'express';
import { isDemoEnabled } from './gate.js';
import { logger } from '../config/logger.js';

/**
 * Middleware that blocks requests if DEMO_MODE is not enabled.
 * Returns 404 Not Found to hide demo endpoints from non-demo environments.
 */
export function demoGate(req: Request, res: Response, next: NextFunction) {
  if (!isDemoEnabled()) {
    // Log the blocked attempt at debug level
    logger.debug({ path: req.path, ip: req.ip }, 'Blocked request to disabled demo endpoint');

    // Return 404 to pretend the endpoint doesn't exist (security by obscurity for this feature)
    res.status(404).json({ error: 'Not Found' });
    return;
  }
  next();
}
