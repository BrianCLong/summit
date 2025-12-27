import { Request, Response, NextFunction } from 'express';
import { Gauge } from 'prom-client';

// We might want to register this gauge only once or check if it exists
// But for simplicity in this file scope it's fine as long as module is cached.
// Ideally metrics should be in metrics.ts to avoid duplicate registration errors on reload.
// But I'll define it here for now. If it errors, I'll move it.

const activeRequests = new Gauge({
  name: 'graphql_active_requests',
  help: 'Number of active GraphQL requests per tenant',
  labelNames: ['tenant_id'],
});

const MAX_CONCURRENCY = parseInt(process.env.GRAPHQL_MAX_CONCURRENCY || '50', 10);

const tenantCounters = new Map<string, number>();

export function backpressureMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to GraphQL requests
  if (req.path !== '/graphql') return next();

  // Try to determine tenant from user (if auth ran) or header
  const tenantId = (req as any).user?.tenant_id ||
                   req.headers['x-tenant-id'] as string ||
                   'default';

  const current = tenantCounters.get(tenantId) || 0;

  if (current >= MAX_CONCURRENCY) {
    // Reject
    return res.status(429).json({
        errors: [{ message: 'Too Many Requests: Concurrency limit exceeded.' }],
        extensions: { code: 'TOO_MANY_REQUESTS', retryAfter: 5 }
    });
  }

  tenantCounters.set(tenantId, current + 1);
  activeRequests.set({ tenant_id: tenantId }, current + 1);

  res.on('finish', () => {
    const val = tenantCounters.get(tenantId) || 1;
    // Ensure we don't go below zero
    const newVal = Math.max(0, val - 1);
    tenantCounters.set(tenantId, newVal);
    activeRequests.set({ tenant_id: tenantId }, newVal);
  });

  next();
}
