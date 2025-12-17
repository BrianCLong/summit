/**
 * Usage examples for @intelgraph/logger
 */

import createLogger, { createChildLogger, createLogMiddleware, LogLevel, logWithSpan } from './index.js';

// Example 1: Basic logger creation
const logger = createLogger({
  serviceName: 'summit-api',
  level: 'info',
});

logger.info('Application starting');
logger.info({ port: 4000 }, 'Server listening');

// Example 2: Structured logging with context
logger.info({
  userId: 'user-123',
  action: 'create_investigation',
  investigationId: 'inv-456',
}, 'Investigation created');

// Example 3: Error logging
try {
  throw new Error('Something went wrong');
} catch (error) {
  logger.error({ err: error }, 'Failed to process request');
}

// Example 4: Child logger with context
const requestLogger = createChildLogger(logger, {
  requestId: 'req-789',
  userId: 'user-123',
  tenantId: 'tenant-abc',
});

requestLogger.info('Processing request');
requestLogger.warn('Request took longer than expected');

// Example 5: Express middleware
import express from 'express';

const app = express();
app.use(createLogMiddleware(logger));

app.get('/api/health', (req: any, res: any) => {
  // req.log is automatically populated with request context
  req.log.info('Health check requested');
  res.json({ status: 'ok' });
});

// Example 6: Log with OpenTelemetry span
logWithSpan(
  logger,
  LogLevel.INFO,
  'Database query executed',
  {
    query: 'SELECT * FROM entities',
    duration: 150,
    rowCount: 42,
  }
);

// Example 7: Different log levels
logger.trace('Very detailed debugging information');
logger.debug('Debugging information');
logger.info('Informational message');
logger.warn('Warning message');
logger.error('Error occurred');
logger.fatal('Fatal error, application will exit');

// Example 8: Automatic trace correlation
// When running inside an OpenTelemetry instrumented service,
// all logs automatically include traceId and spanId
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('summit-api');
const span = tracer.startSpan('process-request');

// Logs inside this span will automatically have traceId and spanId
logger.info('This log will include trace context');

span.end();

// Example 9: Redacting sensitive data
const sensitiveLogger = createLogger({
  serviceName: 'auth-service',
  redact: ['password', 'token', 'ssn', 'creditCard'],
});

// Password will be redacted from logs
sensitiveLogger.info({
  username: 'john.doe',
  password: 'super-secret', // This will be [Redacted]
  action: 'login',
}, 'User login attempt');

export {};
