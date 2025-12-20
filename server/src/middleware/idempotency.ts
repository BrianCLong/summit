/**
 * Idempotency middleware for safe network retries and batch operations
 * Prevents duplicate mutations using Redis-backed idempotency keys
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import logger from '../utils/logger';

interface IdempotencyOptions {
  /**
   * Redis client instance (will create default if not provided)
   */
  redisClient?: Redis;

  /**
   * TTL for idempotency keys in milliseconds
   * Default: 10 minutes
   */
  ttlMs?: number;

  /**
   * Whether to hash request body for signature
   * Default: true
   */
  includeBody?: boolean;

  /**
   * Whether to include query parameters in signature
   * Default: true
   */
  includeQuery?: boolean;

  /**
   * Headers to include in idempotency signature
   * Default: ['authorization', 'x-tenant-id']
   */
  includeHeaders?: string[];

  /**
   * Maximum size of request body to hash (bytes)
   * Default: 1MB
   */
  maxBodySize?: number;

  /**
   * Feature flag to enable/disable idempotency
   * Default: process.env.ENABLE_IDEMPOTENCY === 'true'
   */
  enabled?: boolean;
}

interface IdempotencyRecord {
  requestHash: string;
  createdAt: string;
  tenantId?: string;
  operationName?: string;
  completed?: boolean;
  responseStatus?: number;
  responseBody?: string;
}

class IdempotencyManager {
  private redis: Redis;
  private options: Required<IdempotencyOptions>;

  constructor(options: IdempotencyOptions = {}) {
    this.options = {
      redisClient: options.redisClient || this.createDefaultRedisClient(),
      ttlMs: options.ttlMs || 10 * 60 * 1000, // 10 minutes
      includeBody: options.includeBody ?? true,
      includeQuery: options.includeQuery ?? true,
      includeHeaders: options.includeHeaders || [
        'authorization',
        'x-tenant-id',
      ],
      maxBodySize: options.maxBodySize || 1024 * 1024, // 1MB
      enabled: options.enabled ?? process.env.ENABLE_IDEMPOTENCY === 'true',
    };

    this.redis = this.options.redisClient;
  }

  private createDefaultRedisClient(): Redis {
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      reconnectOnError: (err) => {
        logger.error('Redis client error in idempotency middleware', {
          error: err,
        });
        return true;
      },
      retryStrategy: (times) => Math.min(times * 50, 500),
    });

    return client;
  }

  /**
   * Generate deterministic hash for request signature
   */
  private generateRequestSignature(req: Request): string {
    const components: string[] = [req.method, req.originalUrl || req.url];

    // Include query parameters
    if (this.options.includeQuery && Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map((key) => `${key}=${req.query[key]}`)
        .join('&');
      components.push(`query:${sortedQuery}`);
    }

    // Include specific headers
    for (const headerName of this.options.includeHeaders) {
      const headerValue = req.get(headerName);
      if (headerValue) {
        components.push(`${headerName}:${headerValue}`);
      }
    }

    // Include request body
    if (this.options.includeBody && req.body) {
      const bodyString =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      if (bodyString.length <= this.options.maxBodySize) {
        components.push(`body:${bodyString}`);
      } else {
        // For large bodies, include size and hash of first/last chunks
        const firstChunk = bodyString.slice(0, 1000);
        const lastChunk = bodyString.slice(-1000);
        const sizeHash = createHash('md5')
          .update(bodyString.length.toString())
          .digest('hex');
        components.push(`body:large:${firstChunk}:${lastChunk}:${sizeHash}`);
      }
    }

    return createHash('sha256').update(components.join('|')).digest('hex');
  }

  /**
   * Check if request is a duplicate and handle accordingly
   */
  async processRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!this.options.enabled) {
        return next();
      }

      const idempotencyKey = req.get('Idempotency-Key');

      if (!idempotencyKey) {
        // No idempotency key provided - allow request
        return next();
      }

      if (!this.isValidIdempotencyKey(idempotencyKey)) {
        res.status(400).json({
          error: 'Invalid idempotency key format',
          code: 'INVALID_IDEMPOTENCY_KEY',
        });
        return;
      }

      const requestSignature = this.generateRequestSignature(req);
      const redisKey = `idempotency:${idempotencyKey}:${requestSignature}`;

      // Extract metadata for logging
      const tenantId =
        req.get('x-tenant-id') ||
        (req as any).user?.tenantId ||
        (req.body as any)?.tenantId;
      const operationName = (req.body as any)?.operationName;

      // Try to acquire idempotency lock
      const lockResult = await this.redis.set(
        redisKey,
        JSON.stringify({
          requestHash: requestSignature,
          createdAt: new Date().toISOString(),
          tenantId,
          operationName,
          completed: false,
        } as IdempotencyRecord),
        {
          NX: true, // Only set if key doesn't exist
          PX: this.options.ttlMs, // Set expiration in milliseconds
        },
      );

      if (!lockResult) {
        // Key already exists - this is a duplicate request
        const existingRecord = await this.redis.get(redisKey);

        if (existingRecord) {
          try {
            const record: IdempotencyRecord = JSON.parse(existingRecord);

            if (
              record.completed &&
              record.responseStatus &&
              record.responseBody
            ) {
              // Return cached response
              res.status(record.responseStatus);
              res.set('X-Idempotency', 'hit');
              res.json(JSON.parse(record.responseBody));

              logger.info('Idempotency hit - returning cached response', {
                idempotencyKey,
                requestSignature,
                tenantId,
                operationName,
                cachedStatus: record.responseStatus,
              });

              return;
            }
          } catch (parseError) {
            logger.warn('Failed to parse existing idempotency record', {
              idempotencyKey,
              error: parseError,
            });
          }
        }

        // Duplicate in progress
        res.status(409).json({
          error: 'Duplicate request detected',
          code: 'IDEMPOTENCY_CONFLICT',
          message:
            'A request with this idempotency key is already being processed',
        });

        logger.warn('Idempotency conflict detected', {
          idempotencyKey,
          requestSignature,
          tenantId,
          operationName,
        });

        return;
      }

      // Request is unique - proceed with processing
      res.set('X-Idempotency', 'accepted');

      // Hook response completion to cache result
      this.hookResponseCompletion(req, res, redisKey);

      logger.debug('Idempotency key accepted', {
        idempotencyKey,
        requestSignature,
        tenantId,
        operationName,
      });

      next();
    } catch (error) {
      logger.error('Idempotency middleware error', {
        error,
        idempotencyKey: req.get('Idempotency-Key'),
      });

      // Fail open - allow request to proceed
      next();
    }
  }

  /**
   * Hook into response to cache successful results
   */
  private hookResponseCompletion(
    req: Request,
    res: Response,
    redisKey: string,
  ): void {
    const originalSend = res.json;
    let responseCaptured = false;

    res.json = function (body: any) {
      if (!responseCaptured) {
        responseCaptured = true;

        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const record: IdempotencyRecord = {
            requestHash: redisKey.split(':')[2],
            createdAt: new Date().toISOString(),
            tenantId: req.get('x-tenant-id'),
            operationName: (req.body as any)?.operationName,
            completed: true,
            responseStatus: res.statusCode,
            responseBody: JSON.stringify(body),
          };

          this.redis
            .set(redisKey, JSON.stringify(record), {
              PX: this.options.ttlMs,
            })
            .catch((error) => {
              logger.error('Failed to cache idempotency response', {
                error,
                redisKey,
              });
            });
        }
      }

      return originalSend.call(this, body);
    }.bind(this);
  }

  /**
   * Validate idempotency key format
   */
  private isValidIdempotencyKey(key: string): boolean {
    // Must be 6-255 characters, alphanumeric + hyphens/underscores
    const regex = /^[a-zA-Z0-9_-]{6,255}$/;
    return regex.test(key);
  }

  /**
   * Clean up expired idempotency records (called by background job)
   */
  async cleanup(): Promise<number> {
    try {
      const pattern = 'idempotency:*';
      let cursor = 0;
      let deletedCount = 0;

      do {
        const scanResult = await this.redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = scanResult.cursor;
        const keys = scanResult.keys;

        if (keys.length > 0) {
          const deleted = await this.redis.del(keys);
          deletedCount += deleted;
        }
      } while (cursor !== 0);

      logger.info('Idempotency cleanup completed', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Idempotency cleanup failed', { error });
      return 0;
    }
  }

  /**
   * Get statistics for monitoring
   */
  async getStats(): Promise<{
    activeKeys: number;
    completedKeys: number;
    errorRate: number;
  }> {
    try {
      const pattern = 'idempotency:*';
      let cursor = 0;
      let activeKeys = 0;
      let completedKeys = 0;

      do {
        const scanResult = await this.redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = scanResult.cursor;

        for (const key of scanResult.keys) {
          const record = await this.redis.get(key);
          if (record) {
            try {
              const parsed: IdempotencyRecord = JSON.parse(record);
              if (parsed.completed) {
                completedKeys++;
              } else {
                activeKeys++;
              }
            } catch {
              // Invalid record
            }
          }
        }
      } while (cursor !== 0);

      return {
        activeKeys,
        completedKeys,
        errorRate: 0, // TODO: Track error rate in metrics
      };
    } catch (error) {
      logger.error('Failed to get idempotency stats', { error });
      return { activeKeys: -1, completedKeys: -1, errorRate: -1 };
    }
  }
}

// Global manager instance
let globalIdempotencyManager: IdempotencyManager | null = null;

/**
 * Express middleware factory
 */
export function createIdempotencyMiddleware(options?: IdempotencyOptions) {
  if (!globalIdempotencyManager) {
    globalIdempotencyManager = new IdempotencyManager(options);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    return globalIdempotencyManager!.processRequest(req, res, next);
  };
}

/**
 * Get global manager for stats/cleanup
 */
export function getIdempotencyManager(): IdempotencyManager {
  if (!globalIdempotencyManager) {
    globalIdempotencyManager = new IdempotencyManager();
  }
  return globalIdempotencyManager;
}

/**
 * Middleware with default configuration
 */
export const idempotencyMiddleware = createIdempotencyMiddleware();
