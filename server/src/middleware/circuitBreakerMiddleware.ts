import { Request, Response, NextFunction } from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const CircuitBreaker = require('./circuitBreaker.js');

// Create a global circuit breaker instance
// In a real app, you might have one per downstream service or heavy endpoint
export const globalApiBreaker = new CircuitBreaker({
  name: 'global-api-breaker',
  failureThreshold: 100, // Trip after 100 failures in window
  recoveryTimeout: 30000, // 30s recovery
  monitoringWindow: 60000, // 1 min window
  volumeThreshold: 50, // Min 50 reqs before tripping
});

export const circuitBreakerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. Fail Fast if Circuit is Open
  if (globalApiBreaker.state === 'OPEN') {
    const now = Date.now();
    if (now < globalApiBreaker.nextAttempt) {
      res.status(503).json({
        error: 'Service Temporarily Unavailable',
        message: 'Circuit breaker is open due to high failure rate',
        retryAfter: Math.ceil((globalApiBreaker.nextAttempt - now) / 1000),
      });
      return;
    }
    // If timeout passed, let it through (Half-Open logic implicit in next success/fail)
  }

  const startTime = Date.now();

  // 2. Monitor Response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Consider 5xx as failures
    if (res.statusCode >= 500) {
      globalApiBreaker.onFailure(new Error(`HTTP ${res.statusCode}`), startTime);
    } else {
      // 4xx and 2xx/3xx are successes for availability purposes
      globalApiBreaker.onSuccess(startTime);
    }
  });

  next();
};
