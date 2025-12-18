/**
 * Request Logger Middleware
 * HTTP request logging using pino
 */

import pinoHttp from 'pino-http';
import pino from 'pino';

const logger = pino({
  name: 'kb-service',
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  // Don't log health checks at info level
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/health/ready',
  },
});

export { logger };
