import pinoHttp from 'pino-http';
import pino from 'pino';
import { randomUUID } from 'crypto';

const logger = pino();

export const loggingMiddleware = pinoHttp({
  logger,
  // Redact sensitive headers
  redact: ['req.headers.authorization', 'req.headers.cookie'],

  // Inject custom properties into the log object
  customProps: (req: any, res) => {
    return {
      correlationId: req.correlationId || req.headers['x-correlation-id'],
      traceId: req.traceId,
      spanId: req.spanId,
      // Extract User ID if available (populated by auth middleware or token inspection)
      userId: req.user?.sub || req.user?.id || 'anonymous',
      tenantId: req.user?.tenant_id,
      // Ensure request ID is present (pino-http generates 'req.id' by default but we map it explicitly if needed)
      requestId: req.id || req.headers['x-request-id'] || randomUUID(),
    };
  },

  // Custom generator for Request ID
  genReqId: (req) => {
    return (req.headers['x-request-id'] as string) || randomUUID();
  },

  // Customize the log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    if (res.statusCode === 404) {
      return 'Resource not found';
    }
    return `${req.method} ${req.url} completed`;
  },
});
