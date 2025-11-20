import { Request, Response, NextFunction } from 'express';

interface Metrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalLatency: number;
  requestsByPath: Map<string, number>;
  requestsByMethod: Map<string, number>;
}

const metrics: Metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalLatency: 0,
  requestsByPath: new Map(),
  requestsByMethod: new Map()
};

/**
 * Metrics collection middleware
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Increment total requests
  metrics.totalRequests++;

  // Track by path
  const path = req.path;
  metrics.requestsByPath.set(path, (metrics.requestsByPath.get(path) || 0) + 1);

  // Track by method
  const method = req.method;
  metrics.requestsByMethod.set(method, (metrics.requestsByMethod.get(method) || 0) + 1);

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const latency = Date.now() - start;
    metrics.totalLatency += latency;

    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Get current metrics
 */
export function getMetrics(): {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  successRate: number;
  requestsByPath: Record<string, number>;
  requestsByMethod: Record<string, number>;
} {
  return {
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    failedRequests: metrics.failedRequests,
    avgLatency: metrics.totalRequests > 0 ? metrics.totalLatency / metrics.totalRequests : 0,
    successRate: metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests) * 100 : 0,
    requestsByPath: Object.fromEntries(metrics.requestsByPath),
    requestsByMethod: Object.fromEntries(metrics.requestsByMethod)
  };
}

/**
 * Reset metrics
 */
export function resetMetrics(): void {
  metrics.totalRequests = 0;
  metrics.successfulRequests = 0;
  metrics.failedRequests = 0;
  metrics.totalLatency = 0;
  metrics.requestsByPath.clear();
  metrics.requestsByMethod.clear();
}
