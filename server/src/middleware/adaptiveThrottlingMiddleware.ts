/**
 * Adaptive Throttling Middleware
 *
 * Dynamically adjusts rate limits based on system load and response times.
 * Implements token bucket with adaptive refill rate.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module middleware/adaptiveThrottlingMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface AdaptiveThrottleConfig {
  /** Base requests per second */
  baseRps: number;
  /** Minimum RPS (floor) */
  minRps: number;
  /** Maximum RPS (ceiling) */
  maxRps: number;
  /** Token bucket size */
  bucketSize: number;
  /** Latency threshold for degradation (ms) */
  latencyThresholdMs: number;
  /** Error rate threshold for degradation (0-1) */
  errorRateThreshold: number;
  /** Adaptation interval in ms */
  adaptationIntervalMs: number;
  /** Recovery rate (tokens per second increase when healthy) */
  recoveryRate: number;
  /** Degradation rate (tokens per second decrease when stressed) */
  degradationRate: number;
  /** Sliding window size for metrics */
  windowSizeMs: number;
}

export interface ThrottleStats {
  currentRps: number;
  baseRps: number;
  tokensAvailable: number;
  bucketSize: number;
  requestsInWindow: number;
  errorsInWindow: number;
  avgLatencyMs: number;
  throttledRequests: number;
  adaptations: number;
  lastAdaptation: number | null;
  state: 'healthy' | 'degraded' | 'critical';
}

interface RequestMetric {
  timestamp: number;
  latencyMs: number;
  error: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'adaptive-throttle-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'AdaptiveThrottlingMiddleware',
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AdaptiveThrottleConfig = {
  baseRps: 100,
  minRps: 10,
  maxRps: 500,
  bucketSize: 200,
  latencyThresholdMs: 500,
  errorRateThreshold: 0.05, // 5%
  adaptationIntervalMs: 5000,
  recoveryRate: 10,
  degradationRate: 20,
  windowSizeMs: 60000,
};

// ============================================================================
// Adaptive Throttler Implementation
// ============================================================================

export class AdaptiveThrottler {
  private config: AdaptiveThrottleConfig;
  private tokens: number;
  private lastRefill: number;
  private currentRps: number;
  private metrics: RequestMetric[] = [];
  private stats: ThrottleStats;
  private adaptationTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<AdaptiveThrottleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentRps = this.config.baseRps;
    this.tokens = this.config.bucketSize;
    this.lastRefill = Date.now();
    this.stats = {
      currentRps: this.currentRps,
      baseRps: this.config.baseRps,
      tokensAvailable: this.tokens,
      bucketSize: this.config.bucketSize,
      requestsInWindow: 0,
      errorsInWindow: 0,
      avgLatencyMs: 0,
      throttledRequests: 0,
      adaptations: 0,
      lastAdaptation: null,
      state: 'healthy',
    };

    // Start adaptation loop
    this.startAdaptationLoop();

    logger.info({ config: this.config }, 'AdaptiveThrottler initialized');
  }

  /**
   * Try to acquire a token for a request
   */
  tryAcquire(): DataEnvelope<boolean> {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens--;
      this.stats.tokensAvailable = this.tokens;

      return createDataEnvelope(true, {
        source: 'AdaptiveThrottler',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Token acquired'),
        classification: DataClassification.INTERNAL,
      });
    }

    this.stats.throttledRequests++;

    return createDataEnvelope(false, {
      source: 'AdaptiveThrottler',
      governanceVerdict: createVerdict(
        GovernanceResult.DENY,
        `Rate limit exceeded (${this.currentRps} rps)`
      ),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Record a completed request for adaptation metrics
   */
  recordRequest(latencyMs: number, error: boolean): void {
    const metric: RequestMetric = {
      timestamp: Date.now(),
      latencyMs,
      error,
    };

    this.metrics.push(metric);
    this.cleanOldMetrics();
    this.updateStats();
  }

  /**
   * Get current statistics
   */
  getStats(): DataEnvelope<ThrottleStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'AdaptiveThrottler',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Manually set rate (for testing or emergency override)
   */
  setRate(rps: number): void {
    this.currentRps = Math.max(
      this.config.minRps,
      Math.min(this.config.maxRps, rps)
    );
    this.stats.currentRps = this.currentRps;
    logger.info({ newRps: this.currentRps }, 'Rate manually adjusted');
  }

  /**
   * Reset to base configuration
   */
  reset(): void {
    this.currentRps = this.config.baseRps;
    this.tokens = this.config.bucketSize;
    this.metrics = [];
    this.stats.state = 'healthy';
    this.stats.throttledRequests = 0;
    this.stats.adaptations = 0;
    logger.info('AdaptiveThrottler reset to base configuration');
  }

  /**
   * Shutdown the throttler
   */
  shutdown(): void {
    if (this.adaptationTimer) {
      clearInterval(this.adaptationTimer);
      this.adaptationTimer = null;
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refillAmount = (elapsed / 1000) * this.currentRps;

    this.tokens = Math.min(this.config.bucketSize, this.tokens + refillAmount);
    this.lastRefill = now;
    this.stats.tokensAvailable = this.tokens;
  }

  private cleanOldMetrics(): void {
    const cutoff = Date.now() - this.config.windowSizeMs;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  private updateStats(): void {
    this.stats.requestsInWindow = this.metrics.length;
    this.stats.errorsInWindow = this.metrics.filter(m => m.error).length;

    if (this.metrics.length > 0) {
      const totalLatency = this.metrics.reduce((sum, m) => sum + m.latencyMs, 0);
      this.stats.avgLatencyMs = totalLatency / this.metrics.length;
    } else {
      this.stats.avgLatencyMs = 0;
    }
  }

  private startAdaptationLoop(): void {
    this.adaptationTimer = setInterval(() => {
      this.adapt();
    }, this.config.adaptationIntervalMs);
  }

  private adapt(): void {
    this.cleanOldMetrics();
    this.updateStats();

    const errorRate = this.stats.requestsInWindow > 0
      ? this.stats.errorsInWindow / this.stats.requestsInWindow
      : 0;

    const isLatencyHigh = this.stats.avgLatencyMs > this.config.latencyThresholdMs;
    const isErrorRateHigh = errorRate > this.config.errorRateThreshold;

    let newState: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let rateChange = 0;

    if (isLatencyHigh && isErrorRateHigh) {
      // Critical: Both latency and errors high
      newState = 'critical';
      rateChange = -this.config.degradationRate * 2;
    } else if (isLatencyHigh || isErrorRateHigh) {
      // Degraded: Either latency or errors high
      newState = 'degraded';
      rateChange = -this.config.degradationRate;
    } else {
      // Healthy: Slowly recover
      newState = 'healthy';
      rateChange = this.config.recoveryRate;
    }

    // Apply rate change
    const previousRps = this.currentRps;
    this.currentRps = Math.max(
      this.config.minRps,
      Math.min(this.config.maxRps, this.currentRps + rateChange)
    );

    // Update stats
    this.stats.currentRps = this.currentRps;
    this.stats.state = newState;

    if (previousRps !== this.currentRps) {
      this.stats.adaptations++;
      this.stats.lastAdaptation = Date.now();

      logger.info(
        {
          previousRps,
          newRps: this.currentRps,
          state: newState,
          errorRate,
          avgLatencyMs: this.stats.avgLatencyMs,
        },
        'Rate limit adapted'
      );
    }
  }
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Creates adaptive throttling middleware
 */
export function createAdaptiveThrottlingMiddleware(config: Partial<AdaptiveThrottleConfig> = {}) {
  const throttler = new AdaptiveThrottler(config);

  return function adaptiveThrottlingMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const startTime = Date.now();
    const result = throttler.tryAcquire();

    if (!result.data) {
      const verdict = result.governanceVerdict || createVerdict(
        GovernanceResult.DENY,
        'Rate limit exceeded'
      );

      const stats = throttler.getStats().data;

      logger.warn(
        {
          path: req.path,
          method: req.method,
          tenantId: (req as any).tenantId,
          currentRps: stats.currentRps,
          state: stats.state,
          verdict: verdict.verdictId,
        },
        'Request throttled'
      );

      // Add retry-after header
      const retryAfterSeconds = Math.ceil(1 / stats.currentRps);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.setHeader('X-RateLimit-Limit', stats.currentRps.toString());
      res.setHeader('X-RateLimit-Remaining', Math.floor(stats.tokensAvailable).toString());

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, please retry later',
        retryAfterSeconds,
        currentState: stats.state,
        governanceVerdict: verdict,
      });
      return;
    }

    // Track response for adaptation
    res.on('finish', () => {
      const latencyMs = Date.now() - startTime;
      const isError = res.statusCode >= 500;
      throttler.recordRequest(latencyMs, isError);
    });

    // Add rate limit headers
    const stats = throttler.getStats().data;
    res.setHeader('X-RateLimit-Limit', stats.currentRps.toString());
    res.setHeader('X-RateLimit-Remaining', Math.floor(stats.tokensAvailable).toString());

    next();
  };
}

// ============================================================================
// Per-Tenant Throttling
// ============================================================================

class TenantThrottlerRegistry {
  private throttlers: Map<string, AdaptiveThrottler> = new Map();
  private config: Partial<AdaptiveThrottleConfig>;

  constructor(config: Partial<AdaptiveThrottleConfig> = {}) {
    this.config = config;
  }

  get(tenantId: string): AdaptiveThrottler {
    let throttler = this.throttlers.get(tenantId);

    if (!throttler) {
      throttler = new AdaptiveThrottler(this.config);
      this.throttlers.set(tenantId, throttler);
    }

    return throttler;
  }

  getAllStats(): DataEnvelope<Map<string, ThrottleStats>> {
    const allStats = new Map<string, ThrottleStats>();

    for (const [tenantId, throttler] of this.throttlers) {
      allStats.set(tenantId, throttler.getStats().data);
    }

    return createDataEnvelope(allStats, {
      source: 'TenantThrottlerRegistry',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'All tenant stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  shutdown(): void {
    for (const throttler of this.throttlers.values()) {
      throttler.shutdown();
    }
    this.throttlers.clear();
  }
}

/**
 * Creates per-tenant adaptive throttling middleware
 */
export function createTenantThrottlingMiddleware(config: Partial<AdaptiveThrottleConfig> = {}) {
  const registry = new TenantThrottlerRegistry(config);

  return function tenantThrottlingMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      // No tenant, use global throttling
      return next();
    }

    const throttler = registry.get(tenantId);
    const startTime = Date.now();
    const result = throttler.tryAcquire();

    if (!result.data) {
      const stats = throttler.getStats().data;

      res.setHeader('Retry-After', Math.ceil(1 / stats.currentRps).toString());

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Tenant rate limit exceeded',
        tenantId,
        retryAfterSeconds: Math.ceil(1 / stats.currentRps),
      });
      return;
    }

    res.on('finish', () => {
      const latencyMs = Date.now() - startTime;
      const isError = res.statusCode >= 500;
      throttler.recordRequest(latencyMs, isError);
    });

    next();
  };
}

// ============================================================================
// Exports
// ============================================================================

export const adaptiveThrottlingMiddleware = createAdaptiveThrottlingMiddleware();

export default adaptiveThrottlingMiddleware;
