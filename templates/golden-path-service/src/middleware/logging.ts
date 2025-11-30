import pino from 'pino';
import pinoHttp from 'pino-http';
import { getRequestId } from './request-context.js';
import { config } from '../config.js';

export const logger = pino({
  level: config.logLevel,
  redact: ['req.headers.authorization'],
  base: { service: config.serviceName }
});

export const loggingMiddleware = pinoHttp({
  logger,
  customProps: () => ({ requestId: getRequestId() })
});
