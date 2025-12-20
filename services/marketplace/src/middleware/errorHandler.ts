import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Request error', { error: err.message, stack: err.stack });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Known business errors
  if (err.message.includes('not found')) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err.message.includes('not available') || err.message.includes('invalid')) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Default server error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}
