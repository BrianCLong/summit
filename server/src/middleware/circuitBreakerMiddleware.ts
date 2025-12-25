import { Request, Response, NextFunction } from 'express';
import { metrics } from '../monitoring/metrics.js';

// Simple in-memory breaker state
interface Breaker {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailure: number;
  nextAttempt: number;
}

const breakers: Record<string, Breaker> = {};

const CONFIG = {
  FAILURE_THRESHOLD: 10,
  RESET_TIMEOUT: 30000, // 30s
};

function getBreaker(service: string): Breaker {
  if (!breakers[service]) {
    breakers[service] = {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      nextAttempt: 0,
    };
    metrics.breakerState.labels(service).set(0);
  }
  return breakers[service];
}

export const circuitBreaker = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Feature flag check (env var for now)
    if (process.env.CIRCUIT_BREAKER_ENABLED !== 'true') {
      return next();
    }

    const breaker = getBreaker(serviceName);

    if (breaker.state === 'OPEN') {
      if (Date.now() > breaker.nextAttempt) {
        breaker.state = 'HALF_OPEN';
        metrics.breakerState.labels(serviceName).set(2); // 2 = Half Open
      } else {
        return res.status(503).json({ error: 'Service Unavailable (Circuit Breaker)' });
      }
    }

    // Wrap response to catch errors
    // Express response 'finish' event captures status code
    res.on('finish', () => {
      if (res.statusCode >= 500) {
        breaker.failures++;
        breaker.lastFailure = Date.now();

        if (breaker.failures >= CONFIG.FAILURE_THRESHOLD) {
          breaker.state = 'OPEN';
          breaker.nextAttempt = Date.now() + CONFIG.RESET_TIMEOUT;
          metrics.breakerState.labels(serviceName).set(1); // 1 = Open
        }
      } else if (res.statusCode < 500 && breaker.state === 'HALF_OPEN') {
        // Success in half-open -> Close
        breaker.state = 'CLOSED';
        breaker.failures = 0;
        metrics.breakerState.labels(serviceName).set(0); // 0 = Closed
      }
    });

    next();
  };
};

export const circuitBreakerMiddleware = circuitBreaker('API_GATEWAY');
