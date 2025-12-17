import { Request, Response, NextFunction } from 'express';
import { systemMonitor } from '../lib/system-monitor.js';
import { logger } from '../config/logger.js';
import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

export const overloadProtection = (req: Request, res: Response, next: NextFunction) => {
  const health = systemMonitor.getHealth();

  if (health.isOverloaded) {
    logger.warn({
      msg: 'Load Shedding Active',
      reason: health.reason,
      metrics: health.metrics
    });

    telemetry.subsystems.api.errors.add(1); // Track dropped requests

    res.set('Retry-After', '5'); // Tell client to retry in 5 seconds
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'System is currently under heavy load. Please retry later.',
      reason: health.reason // Optional: expose reason to client (maybe hide in prod)
    });
    return;
  }

  next();
};
