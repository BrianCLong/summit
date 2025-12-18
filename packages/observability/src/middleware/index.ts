/**
 * CompanyOS Observability SDK - Middleware Module
 *
 * Provides Express middleware for automatic observability instrumentation.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInFlight,
  recordError,
  getMetrics,
  getMetricsContentType,
} from '../metrics/index.js';
import { createLogger, createRequestLogger, type LoggingConfig } from '../logging/index.js';
import { extractContext, injectContext, getTracer } from '../tracing/index.js';
import { createHealthRoutes, initializeHealth, type HealthRouteHandlers } from '../health/index.js';
import type { ServiceConfig } from '../types/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface ObservabilityMiddlewareConfig {
  service: ServiceConfig;
  /** Routes to exclude from metrics/tracing */
  excludeRoutes?: string[];
  /** Enable request logging */
  requestLogging?: boolean;
  /** Enable distributed tracing */
  tracing?: boolean;
  /** Custom route normalizer */
  routeNormalizer?: (req: Request) => string;
}

// =============================================================================
// METRICS MIDDLEWARE
// =============================================================================

/**
 * Express middleware for collecting HTTP metrics
 */
export function metricsMiddleware(config: ObservabilityMiddlewareConfig): RequestHandler {
  const { service, excludeRoutes = ['/health', '/metrics', '/ready', '/live'], routeNormalizer } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip excluded routes
    const route = routeNormalizer?.(req) || req.route?.path || req.path;
    if (excludeRoutes.some((r) => route.startsWith(r))) {
      return next();
    }

    const startTime = process.hrtime.bigint();

    // Track in-flight requests
    httpRequestsInFlight.labels({ service: service.name, method: req.method }).inc();

    // Record metrics on response finish
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e9; // Convert to seconds

      httpRequestsTotal
        .labels({
          service: service.name,
          method: req.method,
          route,
          status_code: String(res.statusCode),
        })
        .inc();

      httpRequestDuration
        .labels({
          service: service.name,
          method: req.method,
          route,
          status_code: String(res.statusCode),
        })
        .observe(duration);

      httpRequestsInFlight.labels({ service: service.name, method: req.method }).dec();

      // Record errors
      if (res.statusCode >= 500) {
        recordError('http_5xx', 'high', service.name);
      } else if (res.statusCode >= 400) {
        recordError('http_4xx', 'low', service.name);
      }
    });

    next();
  };
}

// =============================================================================
// TRACING MIDDLEWARE
// =============================================================================

/**
 * Express middleware for distributed tracing
 */
export function tracingMiddleware(config: ObservabilityMiddlewareConfig): RequestHandler {
  const { service, excludeRoutes = ['/health', '/metrics', '/ready', '/live'], routeNormalizer } = config;
  const tracer = getTracer(service.name, service.version);

  return (req: Request, res: Response, next: NextFunction): void => {
    const route = routeNormalizer?.(req) || req.route?.path || req.path;

    // Skip excluded routes
    if (excludeRoutes.some((r) => route.startsWith(r))) {
      return next();
    }

    // Extract parent context from headers
    const parentContext = extractContext(req.headers as Record<string, string>);

    // Start span
    const span = tracer.startSpan(
      `HTTP ${req.method} ${route}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.route': route,
          'http.scheme': req.protocol,
          'http.host': req.hostname,
          'http.user_agent': req.get('user-agent') || '',
          'http.request_content_length': req.get('content-length'),
          'service.name': service.name,
          'service.version': service.version,
        },
      },
      parentContext
    );

    // Store span in request for downstream access
    (req as any).span = span;

    // Inject trace context into response headers
    const responseHeaders: Record<string, string> = {};
    context.with(trace.setSpan(parentContext, span), () => {
      injectContext(responseHeaders);
    });
    Object.entries(responseHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Record response
    res.on('finish', () => {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_content_length': res.get('content-length'),
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
    });

    // Continue with span context
    context.with(trace.setSpan(parentContext, span), () => {
      next();
    });
  };
}

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================

/**
 * Express middleware for request logging
 */
export function requestLoggingMiddleware(config: ObservabilityMiddlewareConfig): RequestHandler {
  const { service, excludeRoutes = ['/health', '/metrics', '/ready', '/live'] } = config;
  const logger = createLogger({ service });

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip excluded routes
    if (excludeRoutes.some((r) => req.path.startsWith(r))) {
      return next();
    }

    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || generateRequestId();

    // Create child logger with request context
    const reqLogger = createRequestLogger(logger, {
      requestId,
      userId: (req as any).user?.id,
      tenantId: (req as any).tenant?.id,
    });

    // Attach logger to request
    (req as any).log = reqLogger;

    // Log request start
    reqLogger.info(
      {
        req: {
          method: req.method,
          url: req.url,
          headers: {
            'user-agent': req.get('user-agent'),
            'content-type': req.get('content-type'),
          },
        },
      },
      'Request started'
    );

    // Log request completion
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      reqLogger[level](
        {
          res: {
            statusCode: res.statusCode,
          },
          duration_ms: duration,
        },
        'Request completed'
      );
    });

    next();
  };
}

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// METRICS ENDPOINT
// =============================================================================

/**
 * Express handler for Prometheus metrics endpoint
 */
export function metricsHandler(): RequestHandler {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      res.set('Content-Type', getMetricsContentType());
      res.send(await getMetrics());
    } catch (error) {
      res.status(500).send('Error collecting metrics');
    }
  };
}

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

/**
 * Express error handling middleware with observability
 */
export function errorMiddleware(config: ObservabilityMiddlewareConfig): (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  const { service } = config;
  const logger = createLogger({ service });

  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    // Record error metrics
    recordError(err.name || 'UnknownError', 'high', service.name);

    // Log error
    const reqLogger = (req as any).log || logger;
    reqLogger.error(
      {
        err,
        req: {
          method: req.method,
          url: req.url,
        },
      },
      'Request error'
    );

    // Record exception in span
    const span = (req as any).span;
    if (span) {
      span.recordException(err);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message,
      });
    }

    // Send error response
    const statusCode = (err as any).statusCode || (err as any).status || 500;
    res.status(statusCode).json({
      error: {
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      },
    });
  };
}

// =============================================================================
// COMBINED MIDDLEWARE
// =============================================================================

export interface ObservabilityMiddleware {
  metrics: RequestHandler;
  tracing: RequestHandler;
  logging: RequestHandler;
  metricsEndpoint: RequestHandler;
  errorHandler: (err: Error, req: Request, res: Response, next: NextFunction) => void;
  health: HealthRouteHandlers;
}

/**
 * Create all observability middleware for a service
 */
export function createObservabilityMiddleware(
  config: ObservabilityMiddlewareConfig
): ObservabilityMiddleware {
  // Initialize health checks
  initializeHealth(config.service);

  return {
    metrics: metricsMiddleware(config),
    tracing: tracingMiddleware(config),
    logging: requestLoggingMiddleware(config),
    metricsEndpoint: metricsHandler(),
    errorHandler: errorMiddleware(config),
    health: createHealthRoutes(),
  };
}

// =============================================================================
// EXPRESS APP SETUP HELPER
// =============================================================================

/**
 * Setup observability on an Express app
 */
export function setupObservability(
  app: {
    use: (handler: RequestHandler) => void;
    get: (path: string, handler: RequestHandler) => void;
  },
  config: ObservabilityMiddlewareConfig
): ObservabilityMiddleware {
  const middleware = createObservabilityMiddleware(config);

  // Apply middleware
  app.use(middleware.logging);
  app.use(middleware.tracing);
  app.use(middleware.metrics);

  // Setup routes
  app.get('/metrics', middleware.metricsEndpoint);
  app.get('/health', middleware.health.liveness as unknown as RequestHandler);
  app.get('/health/live', middleware.health.liveness as unknown as RequestHandler);
  app.get('/health/ready', middleware.health.readiness as unknown as RequestHandler);
  app.get('/health/detailed', middleware.health.detailed as unknown as RequestHandler);

  return middleware;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { Request, Response, NextFunction, RequestHandler };
