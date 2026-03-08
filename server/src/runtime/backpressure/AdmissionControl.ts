
import { Request, Response, NextFunction } from 'express';
import { BackpressureController, PriorityClass } from './BackpressureController.js';

/**
 * Middleware to enforce admission control.
 */
export const admissionControl = async (req: Request, res: Response, next: NextFunction) => {
  const controller = BackpressureController.getInstance();

  // Determine priority based on route or headers
  let priority = PriorityClass.NORMAL;

  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/health')) {
    priority = PriorityClass.CRITICAL;
  } else if (req.path.startsWith('/api/analytics') || req.path.startsWith('/api/reporting')) {
    priority = PriorityClass.BEST_EFFORT;
  }

  // Tenant ID for attribution (if needed later)
  const tenantId = (req as any).user?.tenantId || 'anonymous';

  const requestId = req.headers['x-request-id'] as string || Math.random().toString(36).substring(7);

  try {
    const result = await controller.requestAdmission({
      id: requestId,
      tenantId,
      priority,
    });

    if (result.allowed) {
      // Hook into response finish to release slot
      res.on('finish', () => {
        controller.release(requestId);
      });
      res.on('close', () => {
         controller.release(requestId);
      });
      next();
    } else {
      res.status(503).json({
        error: 'Service Unavailable',
        message: result.reason || 'Server is under heavy load',
        retryAfter: result.waitMs ? Math.ceil(result.waitMs / 1000) : 5
      });
    }
  } catch (err: any) {
    console.error('Admission control error', err);
    res.status(500).send('Internal Server Error');
  }
};
