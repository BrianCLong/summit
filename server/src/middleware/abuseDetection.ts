
import { Request, Response, NextFunction } from 'express';
import { metrics } from '../monitoring/metrics.js';
import { provenanceLedger } from '../provenance/ledger.js';

// Simple in-memory cache for abuse tracking (should be Redis in production)
const abuseCache = new Map<string, { count: number; blockedUntil: number }>();

const REPEAT_WINDOW_MS = 60 * 1000; // 1 minute
const REPEAT_THRESHOLD = 5; // 5 identical failed requests
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const abuseDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const key = `abuse:${ip}`;

  const entry = abuseCache.get(key);

  if (entry && entry.blockedUntil > Date.now()) {
    return res.status(403).json({
      error: 'Access denied due to suspicious activity.',
      retryAfter: Math.ceil((entry.blockedUntil - Date.now()) / 1000)
    });
  }

  // Hook into response to check for repeated failures
  const originalSend = res.json;
  res.json = function (body: any) {
    if (res.statusCode === 403 || res.statusCode === 422) {
      // Check if it's the same error?
      // For now, just count failed requests from this IP.
      const now = Date.now();
      const currentEntry = abuseCache.get(key) || { count: 0, blockedUntil: 0 };

      // Reset count if window passed
      // Ideally we need sliding window, but this is MVP.

      currentEntry.count += 1;
      abuseCache.set(key, currentEntry);

      if (currentEntry.count > REPEAT_THRESHOLD) {
        currentEntry.blockedUntil = now + BLOCK_DURATION_MS;
        abuseCache.set(key, currentEntry);

        // Audit Log
        provenanceLedger.appendEntry({
          tenantId: (req as any).user?.tenantId || 'unknown',
          actionType: 'ABUSE_DETECTED',
          resourceType: 'system',
          resourceId: 'abuse-guard',
          actorId: (req as any).user?.id || ip,
          actorType: 'user',
          timestamp: new Date(),
          payload: {
             mutationType: 'UPDATE',
             entityId: 'abuse-guard',
             entityType: 'System',
             data: { reason: 'Retry Spamming', ip }
          },
          metadata: { count: currentEntry.count }
        }).catch(err => console.error('Failed to log abuse', err));

        metrics.applicationErrors.labels('abuse_detection', 'retry_spam', 'high').inc();
      }
    }
    return originalSend.call(this, body);
  };

  next();
};
