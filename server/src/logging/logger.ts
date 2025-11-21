import pino from 'pino';
import { context } from './context';

const isDev = process.env.NODE_ENV === 'development';
// Jest sets NODE_ENV to 'test'

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const pinoOptions = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport,
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() };
    },
  },
  mixin: () => {
    const currentContext = context.get();
    if (!currentContext) {
      return {};
    }

    return {
      correlationId: currentContext.correlationId,
      traceId: currentContext.traceId,
      spanId: currentContext.spanId,
      userId: currentContext.userId,
    };
  },
  // Redact sensitive keys
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'password',
      'token',
      'secret',
      'creditCard',
    ],
    remove: true,
  },
};

export const logger = pino(pinoOptions);

// Create a child logger for specific modules
export const createLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};
