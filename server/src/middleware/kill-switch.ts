import { Request, Response, NextFunction } from 'express';
import { KillSwitchService } from '../services/KillSwitchService.js';
import { logger } from '../config/logger.js';

export function killSwitchGuard(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const service = KillSwitchService.getInstance();
      const isActive = await service.isActive(moduleName);

      if (isActive) {
        logger.warn({ module: moduleName, action: 'BLOCKED' }, 'Request blocked by kill switch');
        return res.status(503).json({
          message: `Module ${moduleName} is temporarily disabled via kill switch`,
          reason: 'Administrative Lock',
        });
      }

      return next();
    } catch (error) {
      logger.error({ error, module: moduleName }, 'Error checking kill switch');
      // Fail open or closed? "Make unsafe releases impossible" -> Fail Closed.
      return res.status(500).json({ error: 'Internal Security Error' });
    }
  };
}
