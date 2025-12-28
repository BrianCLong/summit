/**
 * Bulkhead Middleware
 *
 * Implements the bulkhead pattern for resource isolation.
 * Limits concurrent operations per resource pool to prevent cascade failures.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.2 (Incident Detection)
 *
 * @module middleware/bulkheadMiddleware
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

export interface BulkheadConfig {
  /** Maximum concurrent executions */
  maxConcurrent: number;
  /** Maximum queue size (0 = no queue) */
  queueSize: number;
  /** Queue timeout in milliseconds */
  queueTimeoutMs: number;
  /** Enable metrics collection */
  enableMetrics: boolean;
}

export interface BulkheadStats {
  name: string;
  concurrent: number;
  maxConcurrent: number;
  queued: number;
  maxQueued: number;
  rejected: number;
  completed: number;
  timedOut: number;
}

interface QueuedRequest {
  id: string;
  resolve: () => void;
  reject: (error: Error) => void;
  queuedAt: number;
  timer: NodeJS.Timeout;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'bulkhead-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'BulkheadMiddleware',
  };
}

// ============================================================================
// Default Configurations
// ============================================================================

export const BULKHEAD_PRESETS: Record<string, BulkheadConfig> = {
  'database-queries': {
    maxConcurrent: 50,
    queueSize: 100,
    queueTimeoutMs: 5000,
    enableMetrics: true,
  },
  'neo4j-writes': {
    maxConcurrent: 20,
    queueSize: 50,
    queueTimeoutMs: 10000,
    enableMetrics: true,
  },
  'external-api': {
    maxConcurrent: 10,
    queueSize: 20,
    queueTimeoutMs: 30000,
    enableMetrics: true,
  },
  'plugin-execution': {
    maxConcurrent: 5,
    queueSize: 10,
    queueTimeoutMs: 60000,
    enableMetrics: true,
  },
  'ai-inference': {
    maxConcurrent: 3,
    queueSize: 10,
    queueTimeoutMs: 120000,
    enableMetrics: true,
  },
  'report-generation': {
    maxConcurrent: 2,
    queueSize: 5,
    queueTimeoutMs: 300000,
    enableMetrics: true,
  },
  'default': {
    maxConcurrent: 20,
    queueSize: 50,
    queueTimeoutMs: 10000,
    enableMetrics: true,
  },
};

// ============================================================================
// Bulkhead Implementation
// ============================================================================

export class Bulkhead {
  private name: string;
  private config: BulkheadConfig;
  private concurrent: number = 0;
  private queue: QueuedRequest[] = [];
  private stats: BulkheadStats;

  constructor(name: string, config: BulkheadConfig) {
    this.name = name;
    this.config = config;
    this.stats = {
      name,
      concurrent: 0,
      maxConcurrent: config.maxConcurrent,
      queued: 0,
      maxQueued: config.queueSize,
      rejected: 0,
      completed: 0,
      timedOut: 0,
    };
  }

  /**
   * Try to acquire a permit to execute
   */
  async acquire(): Promise<DataEnvelope<boolean>> {
    // Check if we can execute immediately
    if (this.concurrent < this.config.maxConcurrent) {
      this.concurrent++;
      this.stats.concurrent = this.concurrent;

      return createDataEnvelope(true, {
        source: 'Bulkhead',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Permit acquired'),
        classification: DataClassification.INTERNAL,
      });
    }

    // Check if we can queue
    if (this.queue.length >= this.config.queueSize) {
      this.stats.rejected++;

      logger.warn(
        { bulkhead: this.name, concurrent: this.concurrent, queued: this.queue.length },
        'Bulkhead rejected: queue full'
      );

      return createDataEnvelope(false, {
        source: 'Bulkhead',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Queue full'),
        classification: DataClassification.INTERNAL,
      });
    }

    // Add to queue
    return new Promise((resolve) => {
      const requestId = uuidv4();
      let queuedRequest: QueuedRequest;

      const timer = setTimeout(() => {
        // Remove from queue on timeout
        const index = this.queue.findIndex(r => r.id === requestId);
        if (index !== -1) {
          this.queue.splice(index, 1);
          this.stats.queued = this.queue.length;
          this.stats.timedOut++;

          logger.warn(
            { bulkhead: this.name, requestId, queueTimeoutMs: this.config.queueTimeoutMs },
            'Bulkhead queue timeout'
          );

          resolve(createDataEnvelope(false, {
            source: 'Bulkhead',
            governanceVerdict: createVerdict(GovernanceResult.DENY, 'Queue timeout'),
            classification: DataClassification.INTERNAL,
          }));
        }
      }, this.config.queueTimeoutMs);

      queuedRequest = {
        id: requestId,
        resolve: () => {
          clearTimeout(timer);
          this.concurrent++;
          this.stats.concurrent = this.concurrent;

          resolve(createDataEnvelope(true, {
            source: 'Bulkhead',
            governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Permit acquired from queue'),
            classification: DataClassification.INTERNAL,
          }));
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          resolve(createDataEnvelope(false, {
            source: 'Bulkhead',
            governanceVerdict: createVerdict(GovernanceResult.DENY, error.message),
            classification: DataClassification.INTERNAL,
          }));
        },
        queuedAt: Date.now(),
        timer,
      };

      this.queue.push(queuedRequest);
      this.stats.queued = this.queue.length;
    });
  }

  /**
   * Release a permit after execution completes
   */
  release(): void {
    this.concurrent--;
    this.stats.concurrent = this.concurrent;
    this.stats.completed++;

    // Process next queued request
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.stats.queued = this.queue.length;
        next.resolve();
      }
    }
  }

  /**
   * Get current statistics
   */
  getStats(): DataEnvelope<BulkheadStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'Bulkhead',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get current availability
   */
  getAvailability(): { available: number; queued: number; total: number } {
    return {
      available: Math.max(0, this.config.maxConcurrent - this.concurrent),
      queued: this.queue.length,
      total: this.config.maxConcurrent,
    };
  }
}

// ============================================================================
// Bulkhead Registry
// ============================================================================

class BulkheadRegistry {
  private bulkheads: Map<string, Bulkhead> = new Map();

  /**
   * Get or create a bulkhead
   */
  get(name: string, config?: BulkheadConfig): Bulkhead {
    let bulkhead = this.bulkheads.get(name);

    if (!bulkhead) {
      const effectiveConfig = config || BULKHEAD_PRESETS[name] || BULKHEAD_PRESETS.default;
      bulkhead = new Bulkhead(name, effectiveConfig);
      this.bulkheads.set(name, bulkhead);

      logger.info({ name, config: effectiveConfig }, 'Bulkhead created');
    }

    return bulkhead;
  }

  /**
   * Get all bulkhead stats
   */
  getAllStats(): DataEnvelope<BulkheadStats[]> {
    const stats = Array.from(this.bulkheads.values()).map(b => b.getStats().data);

    return createDataEnvelope(stats, {
      source: 'BulkheadRegistry',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'All stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }
}

// Global registry
const registry = new BulkheadRegistry();

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Creates bulkhead middleware for a specific resource pool
 */
export function createBulkheadMiddleware(
  poolName: string,
  config?: BulkheadConfig
) {
  const bulkhead = registry.get(poolName, config);

  return async function bulkheadMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const result = await bulkhead.acquire();

    if (!result.data) {
      const verdict = result.metadata?.governanceVerdict || createVerdict(
        GovernanceResult.DENY,
        'Bulkhead rejected request'
      );

      logger.warn(
        {
          path: req.path,
          method: req.method,
          pool: poolName,
          tenantId: (req as any).tenantId,
          verdict: verdict.verdictId,
        },
        'Request rejected by bulkhead'
      );

      res.status(503).json({
        error: 'Service Unavailable',
        message: 'System is at capacity, please retry later',
        pool: poolName,
        governanceVerdict: verdict,
      });
      return;
    }

    // Attach release function to response
    res.on('finish', () => {
      bulkhead.release();
    });

    res.on('close', () => {
      // Also release if connection closes unexpectedly
      bulkhead.release();
    });

    next();
  };
}

// ============================================================================
// Decorator for Async Operations
// ============================================================================

/**
 * Wraps an async operation with bulkhead protection
 */
export async function withBulkhead<T>(
  poolName: string,
  operation: () => Promise<T>,
  config?: BulkheadConfig
): Promise<DataEnvelope<T>> {
  const bulkhead = registry.get(poolName, config);
  const acquired = await bulkhead.acquire();

  if (!acquired.data) {
    throw new BulkheadRejectError(poolName, acquired.metadata?.governanceVerdict);
  }

  try {
    const result = await operation();
    return createDataEnvelope(result, {
      source: 'Bulkhead',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Operation completed'),
      classification: DataClassification.INTERNAL,
    });
  } finally {
    bulkhead.release();
  }
}

/**
 * Custom error for bulkhead rejection
 */
export class BulkheadRejectError extends Error {
  public readonly poolName: string;
  public readonly governanceVerdict?: GovernanceVerdict;

  constructor(poolName: string, verdict?: GovernanceVerdict) {
    super(`Bulkhead '${poolName}' rejected request`);
    this.name = 'BulkheadRejectError';
    this.poolName = poolName;
    this.governanceVerdict = verdict;
  }
}

// ============================================================================
// Exports
// ============================================================================

export function getBulkhead(name: string, config?: BulkheadConfig): Bulkhead {
  return registry.get(name, config);
}

export function getAllBulkheadStats(): DataEnvelope<BulkheadStats[]> {
  return registry.getAllStats();
}

// Pre-configured middleware instances
export const databaseBulkhead = createBulkheadMiddleware('database-queries');
export const neo4jBulkhead = createBulkheadMiddleware('neo4j-writes');
export const externalApiBulkhead = createBulkheadMiddleware('external-api');
export const pluginBulkhead = createBulkheadMiddleware('plugin-execution');
export const aiBulkhead = createBulkheadMiddleware('ai-inference');

export default createBulkheadMiddleware;
