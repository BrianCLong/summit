import pino from 'pino';

const baseLogger = pino({
  name: 'sandbox-tenant-profile',
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
});

export function createLogger(component: string) {
  return baseLogger.child({ component });
}

export { baseLogger as logger };
