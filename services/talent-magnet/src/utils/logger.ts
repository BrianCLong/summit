// Simple logger wrapper for compatibility
interface LogFn {
  (msg: string): void;
  (obj: object, msg?: string): void;
}

interface LoggerInterface {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
  child: (bindings: object) => LoggerInterface;
}

const createLogFn = (level: string, context?: string): LogFn => {
  return (objOrMsg: string | object, msg?: string) => {
    const prefix = context ? `[${context}]` : '';
    if (typeof objOrMsg === 'string') {
      // eslint-disable-next-line no-console
      console[level as 'log'](`${prefix} ${objOrMsg}`);
    } else {
      // eslint-disable-next-line no-console
      console[level as 'log'](`${prefix}`, msg || '', objOrMsg);
    }
  };
};

const createLogger = (context?: string): LoggerInterface => ({
  info: createLogFn('info', context),
  warn: createLogFn('warn', context),
  error: createLogFn('error', context),
  debug: createLogFn('debug', context),
  child: (bindings: object) =>
    createLogger(context ? `${context}:${JSON.stringify(bindings)}` : JSON.stringify(bindings)),
});

export const logger = createLogger('talent-magnet');

export const createChildLogger = (context: string): LoggerInterface =>
  createLogger(context);
