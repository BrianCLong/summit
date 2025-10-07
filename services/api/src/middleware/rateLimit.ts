import { Request, Response, NextFunction } from 'express';
import { rateLimitCounter, circuitBreakerCounter } from '../utils/prometheus.js';

// --- Rate Limiter Configuration ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // Max 100 requests per minute
const requestCounts = new Map<string, { count: number; timer: NodeJS.Timeout }>();

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip; // Or req.user.id for authenticated users

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 0, timer: setTimeout(() => requestCounts.delete(ip), RATE_LIMIT_WINDOW_MS) });
  }

  const clientData = requestCounts.get(ip)!;
  clientData.count++;

  if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
    rateLimitCounter.inc({ status: 'blocked' });
    return res.status(429).json({ error: 'Too Many Requests', reason: 'Rate limit exceeded' });
  }

  rateLimitCounter.inc({ status: 'allowed' });
  next();
}

// --- Circuit Breaker Configuration ---
const FAILURE_THRESHOLD = 5; // Number of consecutive failures to open the circuit
const RESET_TIMEOUT_MS = 30 * 1000; // Time to wait before attempting to close the circuit

enum CircuitState { CLOSED, OPEN, HALF_OPEN }

interface Circuit {
  state: CircuitState;
  failureCount: number;
  nextAttempt: number;
}

const circuits = new Map<string, Circuit>();

function getCircuit(provider: string): Circuit {
  if (!circuits.has(provider)) {
    circuits.set(provider, { state: CircuitState.CLOSED, failureCount: 0, nextAttempt: 0 });
  }
  return circuits.get(provider)!;
}

export function circuitBreaker(provider: string, func: Function) {
  const circuit = getCircuit(provider);

  return async (...args: any[]) => {
    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() > circuit.nextAttempt) {
        circuit.state = CircuitState.HALF_OPEN;
        circuitBreakerCounter.inc({ state: 'half_open' });
      } else {
        circuitBreakerCounter.inc({ state: 'open_blocked' });
        throw new Error(`Circuit breaker is OPEN for ${provider}`);
      }
    }

    try {
      const result = await func(...args);
      if (circuit.state === CircuitState.HALF_OPEN) {
        circuit.state = CircuitState.CLOSED;
        circuit.failureCount = 0;
        circuitBreakerCounter.inc({ state: 'closed' });
      }
      return result;
    } catch (error) {
      circuit.failureCount++;
      if (circuit.failureCount >= FAILURE_THRESHOLD) {
        circuit.state = CircuitState.OPEN;
        circuit.nextAttempt = Date.now() + RESET_TIMEOUT_MS;
        circuitBreakerCounter.inc({ state: 'open' });
      }
      throw error;
    }
  };
}

export const rateLimitMiddleware = rateLimiter;
