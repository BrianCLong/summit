// @ts-nocheck
/**
 * Monitoring middleware for Express and GraphQL
 */
import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestsTotal,
  businessApiCallsTotal,
  graphqlRequestsTotal,
  graphqlErrors,
  graphqlRequestDuration,
  dbQueryDuration,
  dbQueriesTotal,
  aiJobsQueued,
  aiJobsProcessing,
  aiJobDuration,
  aiJobsTotal,
  graphOperationDuration,
  websocketConnections,
  websocketMessages,
  applicationErrors,
  investigationOperations
} from './metrics.js';
import { getTracer, SpanKind } from '../observability/tracer.js';

/**
 * Express middleware to track HTTP request metrics
 */
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Track request count
  httpRequestsTotal.inc({
    method: req.method,
    route: req.route?.path || req.path || 'unknown',
    status_code: 'pending',
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  // @ts-ignore
  res.end = function (...args: any[]) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';

    // Update metrics
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration,
    );

    // Update total counter with actual status
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    if (
      route.startsWith('/api') ||
      route.startsWith('/graphql') ||
      route.startsWith('/monitoring')
    ) {
      const tenantId =
        (req.headers['x-tenant-id'] || req.headers['x-tenant']) ?? 'unknown';
      businessApiCallsTotal.inc({
        service: req.baseUrl || 'maestro-api',
        route,
        status_code: String(res.statusCode),
        tenant: Array.isArray(tenantId)
          ? tenantId[0]
          : String(tenantId || 'unknown'),
      });
    }

    originalEnd.apply(this, args);
  };

  next();
}

/**
 * GraphQL middleware to track GraphQL operation metrics
 */
export function graphqlMetricsMiddleware() {
  return {
    requestDidStart() {
      return {
        didResolveOperation(requestContext: any) {
          const operationName =
            requestContext.request.operationName || 'anonymous';
          const operationType = requestContext.operationName || 'unknown';

          // Track GraphQL request
          graphqlRequestsTotal.inc({
            operation: operationName,
            operation_type: operationType,
            status: 'started',
          });

          requestContext.metrics = {
            startTime: Date.now(),
            operationName,
            operationType,
          };
        },

        didEncounterErrors(requestContext: any) {
          const { operationName } = requestContext.metrics || {};

          requestContext.errors.forEach((error: any) => {
            graphqlErrors.inc({
              operation: operationName || 'unknown',
              error_type: error.constructor.name || 'GraphQLError',
            });
          });
        },

        willSendResponse(requestContext: any) {
          const metricData = requestContext.metrics;
          if (!metricData) return;

          const duration = (Date.now() - metricData.startTime) / 1000;
          const hasErrors =
            requestContext.errors && requestContext.errors.length > 0;

          // Track GraphQL request duration
          graphqlRequestDuration.observe(
            {
              operation: metricData.operationName,
              operation_type: metricData.operationType,
            },
            duration,
          );

          // Update request status
          graphqlRequestsTotal.inc({
            operation: metricData.operationName,
            operation_type: metricData.operationType,
            status: hasErrors ? 'error' : 'success',
          });
        },
      };
    },
  };
}

/**
 * Database query wrapper to track DB metrics and spans
 */
export function trackDbQuery<T>(database: string, operation: string, queryFunction: (...args: any[]) => Promise<T>) {
  return async (...args: any[]): Promise<T> => {
    const start = Date.now();
    let status = 'success';
    const tracer = getTracer();

    return tracer.withSpan(`db.${database}.${operation}`, async (span: any) => {
      span.setAttributes({
        'db.system': database,
        'db.operation': operation,
      });

      try {
        const result = await queryFunction(...args);
        return result;
      } catch (error: any) {
        status = 'error';
        throw error;
      } finally {
        const duration = (Date.now() - start) / 1000;

        dbQueryDuration.observe({ database, operation }, duration);

        dbQueriesTotal.inc({
          database,
          operation,
          status,
        });
      }
    }, { kind: SpanKind.CLIENT });
  };
}

/**
 * AI job tracking wrapper
 */
export function trackAiJob<T>(jobType: string, jobFunction: (...args: any[]) => Promise<T>) {
  return async (...args: any[]): Promise<T> => {
    const start = Date.now();
    let status = 'success';
    const tracer = getTracer();

    return tracer.withSpan(`ai.job.${jobType}`, async (span: any) => {
      span.setAttributes({
        'ai.job.type': jobType,
      });

      // Increment queued counter
      aiJobsQueued.inc({ job_type: jobType });

      // Increment processing counter
      aiJobsProcessing.inc({ job_type: jobType });

      try {
        const result = await jobFunction(...args);
        return result;
      } catch (error: any) {
        status = 'error';
        throw error;
      } finally {
        const duration = (Date.now() - start) / 1000;

        // Decrement processing counter
        aiJobsProcessing.dec({ job_type: jobType });

        // Decrement queued counter
        aiJobsQueued.dec({ job_type: jobType });

        // Track job duration and completion
        aiJobDuration.observe({ job_type: jobType, status }, duration);

        aiJobsTotal.inc({
          job_type: jobType,
          status,
        });
      }
    }, { kind: SpanKind.INTERNAL });
  };
}

/**
 * Graph operation tracking wrapper
 */
export function trackGraphOperation<T>(operation: string, investigationId: string, operationFunction: (...args: any[]) => Promise<T>) {
  return async (...args: any[]): Promise<T> => {
    const start = Date.now();
    const tracer = getTracer();

    return tracer.withSpan(`graph.operation.${operation}`, async (span: any) => {
      span.setAttributes({
        'graph.operation': operation,
        'graph.investigation_id': investigationId,
      });
      try {
        const result = await operationFunction(...args);
        return result;
      } finally {
        const duration = (Date.now() - start) / 1000;

        graphOperationDuration.observe(
          { operation, investigation_id: investigationId },
          duration,
        );
      }
    }, { kind: SpanKind.CLIENT });
  };
}

/**
 * WebSocket connection tracking
 */
export function trackWebSocketConnection(io: any) {
  io.on('connection', (socket: any) => {
    websocketConnections.inc();

    socket.on('disconnect', () => {
      websocketConnections.dec();
    });

    // Track messages
    socket.use((packet: any, next: any) => {
      const [eventType] = packet;
      websocketMessages.inc({
        direction: 'incoming',
        event_type: eventType,
      });
      next();
    });

    // Override emit to track outgoing messages
    const originalEmit = socket.emit;
    socket.emit = function (eventType: string, ...args: any[]) {
      websocketMessages.inc({
        direction: 'outgoing',
        event_type: eventType,
      });
      return originalEmit.apply(this, [eventType, ...args]);
    };
  });
}

/**
 * Error tracking wrapper
 */
export function trackError(module: string, errorType: string, severity: string = 'error') {
  applicationErrors.inc({
    module,
    error_type: errorType,
    severity,
  });
}

/**
 * Investigation metrics tracking
 */
export function updateInvestigationMetrics(investigationId: string, operation: string, userId: string) {
  investigationOperations.inc({
    operation,
    user_id: userId,
  });
}
