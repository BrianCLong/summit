import pino from 'pino';

const baseLogger = pino({
  name: 'sandbox-gateway',
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export function createLogger(component: string) {
  return baseLogger.child({ component });
}

export { baseLogger as logger };
