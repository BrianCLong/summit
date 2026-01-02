import { Request, Response, NextFunction } from 'express';
import {
  getCachedFeatureFlagService,
  getSafetyState,
  isGlobalKillSwitchEnabled,
  isSafeModeEnabled,
} from '../config/safety.js';
import { logger } from '../config/logger.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SAFE_MODE_BLOCKED_PREFIXES = [
  '/api/webhooks',
  '/api/stream',
  '/api/ai',
  '/api/aurora',
  '/api/oracle',
  '/api/phantom-limb',
  '/api/echelon2',
  '/api/zero-day',
  '/api/abyss',
  '/api/scenarios',
];

function isHighRiskPath(path: string): boolean {
  return SAFE_MODE_BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isMutatingRequest(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (!MUTATING_METHODS.has(method)) {
    return false;
  }

  if (req.path === '/graphql') {
    const query = typeof req.body?.query === 'string' ? req.body.query.toLowerCase() : '';
    return query.includes('mutation') || query.includes('subscription');
  }

  return true;
}

export async function safetyModeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const flagService = await getCachedFeatureFlagService();

    if (await isGlobalKillSwitchEnabled(flagService)) {
      if (isMutatingRequest(req)) {
        logger.warn({ path: req.path, method: req.method }, 'Request blocked by global kill switch');
        res.status(503).json({
          error: 'Global kill switch active: write operations are temporarily disabled',
          code: 'GLOBAL_KILL_SWITCH_ACTIVE',
        });
        return;
      }
    }

    if (await isSafeModeEnabled(flagService)) {
      if (isHighRiskPath(req.path)) {
        logger.warn({ path: req.path, method: req.method }, 'Request blocked by safe mode');
        res.status(503).json({
          error: 'Safe mode active: high-risk endpoint is temporarily unavailable',
          code: 'SAFE_MODE_ACTIVE',
        });
        return;
      }
    }

    next();
  } catch (error: any) {
    logger.error({ err: error, path: req.path }, 'Safety middleware error');
    next(error);
  }
}

export async function resolveSafetyState() {
  const service = await getCachedFeatureFlagService();
  return getSafetyState(service);
}
