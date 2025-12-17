/**
 * CompanyOS Logger Utility
 */

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export function createLogger(name: string): Logger {
  const formatContext = (context?: Record<string, unknown>): string => {
    if (!context || Object.keys(context).length === 0) return '';
    return ' ' + JSON.stringify(context);
  };

  return {
    info(message: string, context?: Record<string, unknown>): void {
      console.log(`[${new Date().toISOString()}] [INFO] [${name}] ${message}${formatContext(context)}`);
    },
    warn(message: string, context?: Record<string, unknown>): void {
      console.warn(`[${new Date().toISOString()}] [WARN] [${name}] ${message}${formatContext(context)}`);
    },
    error(message: string, context?: Record<string, unknown>): void {
      console.error(`[${new Date().toISOString()}] [ERROR] [${name}] ${message}${formatContext(context)}`);
    },
    debug(message: string, context?: Record<string, unknown>): void {
      if (process.env.DEBUG || process.env.LOG_LEVEL === 'debug') {
        console.debug(`[${new Date().toISOString()}] [DEBUG] [${name}] ${message}${formatContext(context)}`);
      }
    },
  };
}
