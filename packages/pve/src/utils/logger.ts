/**
 * PVE Logger Utility
 *
 * Structured logging for the Policy Validation Engine.
 *
 * @module pve/utils/logger
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  silent?: boolean;
  format?: 'json' | 'text';
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(config: LoggerConfig = { level: 'info' }): Logger {
  const { level, prefix = '[PVE]', silent = false, format = 'text' } = config;
  const minLevel = LOG_LEVELS[level];

  function log(
    logLevel: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (silent || LOG_LEVELS[logLevel] < minLevel) {
      return;
    }

    const entry: LogEntry = {
      level: logLevel,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    const output =
      format === 'json'
        ? JSON.stringify(entry)
        : formatTextLog(entry, prefix);

    switch (logLevel) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
  };
}

function formatTextLog(entry: LogEntry, prefix: string): string {
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
  };

  const reset = '\x1b[0m';
  const color = levelColors[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);

  let output = `${color}${prefix} ${levelStr}${reset} ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context)}`;
  }

  return output;
}

// Default logger instance
export const logger = createLogger();
