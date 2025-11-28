import type { NextFunction, Request, Response } from 'express';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  httpAvailabilityTotals,
  sloAvailability,
} from './metrics.js';

const SERVICE_LABEL = process.env.OTEL_SERVICE_NAME || 'intelgraph-server';

function getRouteLabel(req: Request): string {
  if (req.route?.path) return req.route.path;
  if (req.baseUrl) return req.baseUrl;
  return req.path || 'unmatched';
}

export function httpMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = getRouteLabel(req);
    const statusCode = res.statusCode.toString();

    httpRequestsTotal
      .labels(req.method, route, statusCode, SERVICE_LABEL)
      .inc();

    httpRequestDurationSeconds
      .labels(req.method, route, statusCode, SERVICE_LABEL)
      .observe(durationSeconds);

    httpAvailabilityTotals.total += 1;
    if (statusCode.startsWith('5')) {
      httpAvailabilityTotals.errors += 1;
    }

    const successful = httpAvailabilityTotals.total - httpAvailabilityTotals.errors;
    const availability =
      httpAvailabilityTotals.total === 0
        ? 100
        : (successful / httpAvailabilityTotals.total) * 100;

    sloAvailability.labels('api-availability').set(availability);
  });

  next();
}

