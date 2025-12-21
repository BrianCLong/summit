import type { NextFunction, Request, Response } from 'express';

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = (req.headers['x-tenant-id'] as string) || (req as unknown as { tenantId?: string }).tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'tenant missing' });
    return;
  }
  (req as unknown as { tenantId: string }).tenantId = tenantId;
  next();
}

export function enforceRowLevelSecurity<T extends { tenantId: string }>(tenantId: string, rows: T[]): T[] {
  return rows.filter((row) => row.tenantId === tenantId);
}

export class TenantRateLimiter {
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(capacity = 50, refillPerSecond = 10) {
    this.capacity = capacity;
    this.refillRate = refillPerSecond;
  }

  consume(tenantId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(tenantId) ?? { tokens: this.capacity, updatedAt: now };
    const elapsed = (now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillRate);
    bucket.updatedAt = now;
    if (bucket.tokens < 1) {
      this.buckets.set(tenantId, bucket);
      return false;
    }
    bucket.tokens -= 1;
    this.buckets.set(tenantId, bucket);
    return true;
  }
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly resetMs: number;
  private failures = 0;
  private openedAt = 0;

  constructor(failureThreshold = 5, resetMs = 10_000) {
    this.failureThreshold = failureThreshold;
    this.resetMs = resetMs;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.openedAt = Date.now();
    }
  }

  recordSuccess(): void {
    this.failures = 0;
  }

  canPass(): boolean {
    if (this.failures < this.failureThreshold) return true;
    if (Date.now() - this.openedAt > this.resetMs) {
      this.failures = 0;
      return true;
    }
    return false;
  }
}

export function guardTenantRequest(rateLimiter: TenantRateLimiter) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as unknown as { tenantId?: string }).tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'tenant missing' });
      return;
    }
    const allowed = rateLimiter.consume(tenantId);
    if (!allowed) {
      res.status(429).setHeader('Retry-After', '1').json({ error: 'rate limit' });
      return;
    }
    next();
  };
}
