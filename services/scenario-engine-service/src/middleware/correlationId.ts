/**
 * Correlation ID Middleware
 * Adds correlation ID for request tracing
 */

import { Request, Response, NextFunction } from 'express';
import { generateId } from '../types/index.js';

export interface CorrelatedRequest extends Request {
  correlationId: string;
}

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-correlation-id'] as string) || generateId();
  (req as CorrelatedRequest).correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}
