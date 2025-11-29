import winston from 'winston';

const isDev = process.env.NODE_ENV === 'development';

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isDev
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        )
      : winston.format.json(),
  ),
  defaultMeta: { service: 'config-service' },
  transports: [
    new winston.transports.Console(),
    ...(isDev
      ? []
      : [
          new winston.transports.File({
            filename: 'error.log',
            level: 'error',
          }),
          new winston.transports.File({ filename: 'combined.log' }),
        ]),
  ],
});

export interface Logger {
  info(message: string): void;
  info(meta: Record<string, unknown>, message: string): void;
  warn(message: string): void;
  warn(meta: Record<string, unknown>, message: string): void;
  error(message: string): void;
  error(meta: Record<string, unknown>, message: string): void;
  debug(message: string): void;
  debug(meta: Record<string, unknown>, message: string): void;
  child(meta: Record<string, unknown>): Logger;
}

function createLogger(baseLogger: winston.Logger, baseMeta: Record<string, unknown> = {}): Logger {
  const log = (level: string, args: unknown[]): void => {
    if (args.length === 1 && typeof args[0] === 'string') {
      baseLogger.log(level, args[0], baseMeta);
    } else if (args.length === 2 && typeof args[0] === 'object' && typeof args[1] === 'string') {
      baseLogger.log(level, args[1], { ...baseMeta, ...args[0] });
    } else {
      baseLogger.log(level, String(args[0]), baseMeta);
    }
  };

  return {
    info: (...args: unknown[]) => log('info', args),
    warn: (...args: unknown[]) => log('warn', args),
    error: (...args: unknown[]) => log('error', args),
    debug: (...args: unknown[]) => log('debug', args),
    child: (meta: Record<string, unknown>) => createLogger(baseLogger, { ...baseMeta, ...meta }),
  };
}

export const logger: Logger = createLogger(winstonLogger);

export function createChildLogger(meta: Record<string, unknown>): Logger {
  return logger.child(meta);
}
