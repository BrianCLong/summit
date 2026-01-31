/**
 * Idempotency Middleware
 *
 * Ensures idempotent request handling
 */

import type { Request, Response, NextFunction, IdempotencyOptions, IdempotencyRecord } from '../types';

/**
 * In-memory idempotency storage (for demo, use Redis in production)
 */
class MemoryIdempotencyStorage {
  private store: Map<string, { record: IdempotencyRecord; expiresAt: number }> = new Map();

  async get(key: string): Promise<IdempotencyRecord | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.record;
  }

  async set(key: string, record: IdempotencyRecord, ttl: number): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    this.store.set(key, { record, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
}

export function idempotencyMiddleware(options: IdempotencyOptions) {
  const storage = options.storage || new MemoryIdempotencyStorage();
  const headerName = options.header || 'idempotency-key';
  const ttl = options.ttl || 86400; // 24 hours default

  // Cleanup expired entries every hour
  if (storage instanceof MemoryIdempotencyStorage) {
    setInterval(() => storage.cleanup(), 3600000);
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply to mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.get(headerName);

    if (!idempotencyKey) {
      return next();
    }

    // Store key in context
    if (req.context) {
      req.context.idempotencyKey = idempotencyKey;
    }

    try {
      // Check if we've seen this request before
      const existing = await storage.get(idempotencyKey);

      if (existing) {
        // Return cached response
        res.set(existing.headers);
        return res.status(existing.status).json(existing.body);
      }

      // Intercept response
      const originalJson = res.json.bind(res);
      const originalStatus = res.status.bind(res);

      let statusCode = 200;
      let responseBody: any;

      res.status = function (code: number) {
        statusCode = code;
        return originalStatus(code);
      };

      res.json = function (body: any) {
        responseBody = body;

        // Store in cache
        const record: IdempotencyRecord = {
          key: idempotencyKey,
          status: statusCode,
          headers: res.getHeaders() as Record<string, string>,
          body: responseBody,
          createdAt: new Date(),
        };

        storage.set(idempotencyKey, record, ttl).catch((err) => {
          console.error('Failed to store idempotency record:', err);
        });

        return originalJson(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
