/**
 * Logger utility for Admin CLI
 */

import chalk from 'chalk';
import type { LoggerInterface } from '../types/index.js';

/**
 * Log levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  timestamps: boolean;
  jsonOutput: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
};

let config: LoggerConfig = {
  level: 'info',
  timestamps: false,
  jsonOutput: false,
};

/**
 * Configure logger
 */
export function configureLogger(options: Partial<LoggerConfig>): void {
  config = { ...config, ...options };
}

/**
 * Set log level
 */
export function setLogLevel(level: LogLevel): void {
  config.level = level;
}

/**
 * Enable verbose mode
 */
export function setVerbose(verbose: boolean): void {
  if (verbose) {
    config.level = 'verbose';
  }
}

/**
 * Enable JSON output
 */
export function setJsonOutput(json: boolean): void {
  config.jsonOutput = json;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[config.level];
}

function formatMessage(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): string {
  if (config.jsonOutput) {
    return JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data }),
    });
  }

  const timestamp = config.timestamps ? chalk.gray(`[${new Date().toISOString()}] `) : '';
  const levelColors: Record<LogLevel, (s: string) => string> = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.blue,
    verbose: chalk.cyan,
    debug: chalk.gray,
  };

  const coloredLevel = levelColors[level](`[${level.toUpperCase()}]`);
  const dataStr = data ? ` ${chalk.gray(JSON.stringify(data))}` : '';

  return `${timestamp}${coloredLevel} ${message}${dataStr}`;
}

/**
 * Log error message
 */
export function error(message: string, data?: Record<string, unknown>): void {
  if (shouldLog('error')) {
    console.error(formatMessage('error', message, data));
  }
}

/**
 * Log warning message
 */
export function warn(message: string, data?: Record<string, unknown>): void {
  if (shouldLog('warn')) {
    console.warn(formatMessage('warn', message, data));
  }
}

/**
 * Log info message
 */
export function info(message: string, data?: Record<string, unknown>): void {
  if (shouldLog('info')) {
    console.log(formatMessage('info', message, data));
  }
}

/**
 * Log verbose message
 */
export function verbose(message: string, data?: Record<string, unknown>): void {
  if (shouldLog('verbose')) {
    console.log(formatMessage('verbose', message, data));
  }
}

/**
 * Log debug message
 */
export function debug(message: string, data?: Record<string, unknown>): void {
  if (shouldLog('debug')) {
    console.log(formatMessage('debug', message, data));
  }
}

/**
 * Create logger instance implementing LoggerInterface
 */
export function createLogger(): LoggerInterface {
  return {
    info,
    warn,
    error,
    debug,
    verbose,
  };
}

export const logger: LoggerInterface = createLogger();
