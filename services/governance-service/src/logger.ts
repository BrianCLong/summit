/**
 * Winston Logger Configuration
 * Centralized logging for the governance service
 */

import winston from 'winston';
import { config } from './config.js';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

/**
 * Custom log format for development
 */
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

/**
 * Create logger instance
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: {
    service: 'governance-service',
    environment: config.nodeEnv,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.logging.format === 'json'
        ? combine(json())
        : combine(colorize(), devFormat),
    }),
  ],
});

/**
 * Request logger middleware
 */
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

export default logger;
