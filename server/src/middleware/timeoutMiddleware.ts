/**
 * Timeout Middleware
 *
 * Enforces configurable request timeouts to prevent resource exhaustion.
 * Supports per-route and per-method timeout configuration.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.2 (Incident Detection)
 *
 * @module middleware/timeoutMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  GovernanceVerdict,
  GovernanceResult,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface TimeoutConfig {
  /** Default timeout in milliseconds */
  defaultTimeoutMs: number;
  /** Per-route timeout overrides */
  routeTimeouts: Map<string, number>;
  /** Per-method timeout multipliers */
  methodMultipliers: Map<string, number>;
  /** Header to signal remaining time */
  timeRemainingHeader: string;
  /** Callback on timeout */
  onTimeout?: (req: Request, timeoutMs: number) => void;
}

interface TimeoutState {
  timer: NodeJS.Timeout | null;
  timedOut: boolean;
  startTime: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'timeout-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'TimeoutMiddleware',
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: TimeoutConfig = {
  defaultTimeoutMs: 30000, // 30 seconds
  routeTimeouts: new Map([
    ['/api/v1/reports', 120000],     // Reports can take 2 minutes
    ['/api/v1/exports', 300000],     // Exports can take 5 minutes
    ['/api/v1/imports', 300000],     // Imports can take 5 minutes
    ['/api/v1/analytics', 60000],    // Analytics queries 1 minute
    ['/api/v1/compliance', 60000],   // Compliance assessments 1 minute
    ['/health', 5000],               // Health checks 5 seconds
    ['/ready', 5000],                // Readiness checks 5 seconds
  ]),
  methodMultipliers: new Map([
    ['GET', 1],
    ['POST', 1.5],
    ['PUT', 1.5],
    ['PATCH', 1.5],
    ['DELETE', 1],
  ]),
  timeRemainingHeader: 'X-Time-Remaining-Ms',
};

// ============================================================================
// Timeout Middleware Factory
// ============================================================================

export function createTimeoutMiddleware(config: Partial<TimeoutConfig> = {}) {
  const mergedConfig: TimeoutConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    routeTimeouts: new Map([
      ...DEFAULT_CONFIG.routeTimeouts,
      ...(config.routeTimeouts || new Map()),
    ]),
    methodMultipliers: new Map([
      ...DEFAULT_CONFIG.methodMultipliers,
      ...(config.methodMultipliers || new Map()),
    ]),
  };

  return function timeoutMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip for WebSocket upgrades
    if (req.headers.upgrade === 'websocket') {
      return next();
    }

    const state: TimeoutState = {
      timer: null,
      timedOut: false,
      startTime: Date.now(),
    };

    // Calculate timeout for this request
    const timeoutMs = calculateTimeout(req, mergedConfig);

    // Set timer
    state.timer = setTimeout(() => {
      state.timedOut = true;

      const verdict = createVerdict(
        GovernanceResult.DENY,
        `Request timeout after ${timeoutMs}ms`
      );

      logger.warn(
        {
          path: req.path,
          method: req.method,
          timeoutMs,
          tenantId: (req as any).tenantId,
          requestId: (req as any).requestId,
          verdict: verdict.verdictId,
        },
        'Request timed out'
      );

      // Call timeout handler if provided
      if (mergedConfig.onTimeout) {
        mergedConfig.onTimeout(req, timeoutMs);
      }

      // Send timeout response
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'Request processing exceeded time limit',
          timeoutMs,
          governanceVerdict: verdict,
        });
      }
    }, timeoutMs);

    // Add time remaining header periodically
    const updateTimeRemaining = () => {
      if (!state.timedOut && !res.headersSent) {
        const elapsed = Date.now() - state.startTime;
        const remaining = Math.max(0, timeoutMs - elapsed);
        res.setHeader(mergedConfig.timeRemainingHeader, remaining.toString());
      }
    };

    // Update header before sending response
    const originalSend = res.send.bind(res);
    res.send = function (body: any) {
      updateTimeRemaining();
      return originalSend(body);
    };

    // Clear timer on response finish
    res.on('finish', () => {
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
    });

    // Clear timer on response close (client disconnect)
    res.on('close', () => {
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
    });

    // Attach timeout state to request for downstream use
    (req as any).timeoutState = {
      startTime: state.startTime,
      timeoutMs,
      getRemaining: () => {
        const elapsed = Date.now() - state.startTime;
        return Math.max(0, timeoutMs - elapsed);
      },
      isTimedOut: () => state.timedOut,
    };

    next();
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateTimeout(req: Request, config: TimeoutConfig): number {
  let timeout = config.defaultTimeoutMs;

  // Check for route-specific timeout
  for (const [route, routeTimeout] of config.routeTimeouts) {
    if (req.path.startsWith(route)) {
      timeout = routeTimeout;
      break;
    }
  }

  // Apply method multiplier
  const multiplier = config.methodMultipliers.get(req.method) || 1;
  timeout = Math.round(timeout * multiplier);

  // Check for client-requested timeout (capped)
  const clientTimeout = parseInt(req.headers['x-request-timeout'] as string, 10);
  if (!isNaN(clientTimeout) && clientTimeout > 0) {
    // Client can request shorter timeout, not longer
    timeout = Math.min(timeout, clientTimeout);
  }

  return timeout;
}

// ============================================================================
// Async Operation Timeout Wrapper
// ============================================================================

/**
 * Wraps an async operation with a timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const verdict = createVerdict(
        GovernanceResult.DENY,
        `Operation '${operationName}' timed out after ${timeoutMs}ms`
      );

      logger.warn(
        { operationName, timeoutMs, verdict: verdict.verdictId },
        'Async operation timed out'
      );

      reject(new TimeoutError(operationName, timeoutMs, verdict));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([operation, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Custom timeout error with governance verdict
 */
export class TimeoutError extends Error {
  public readonly operationName: string;
  public readonly timeoutMs: number;
  public readonly governanceVerdict: GovernanceVerdict;

  constructor(operationName: string, timeoutMs: number, verdict: GovernanceVerdict) {
    super(`Operation '${operationName}' timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.operationName = operationName;
    this.timeoutMs = timeoutMs;
    this.governanceVerdict = verdict;
  }
}

// ============================================================================
// Request Context Helper
// ============================================================================

/**
 * Gets timeout state from request context
 */
export function getTimeoutState(req: Request): {
  startTime: number;
  timeoutMs: number;
  getRemaining: () => number;
  isTimedOut: () => boolean;
} | null {
  return (req as any).timeoutState || null;
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const timeoutMiddleware = createTimeoutMiddleware();

export default timeoutMiddleware;
