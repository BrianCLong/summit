/**
 * AgentLogger - Structured logging for agent archetypes
 *
 * Provides consistent, structured logging across all agents with
 * support for log levels, context, and performance tracking.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  agentType?: string;
  userId?: string;
  organizationId?: string;
  action?: string;
  phase?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class AgentLogger {
  private agentType: string;
  private minLevel: LogLevel;
  private static readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(agentType: string, minLevel: LogLevel = 'info') {
    this.agentType = agentType;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return AgentLogger.levelPriority[level] >= AgentLogger.levelPriority[this.minLevel];
  }

  private formatEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        agentType: this.agentType,
        ...context,
      },
    };
  }

  private output(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context.agentType}]`;
    const contextStr = Object.entries(entry.context)
      .filter(([key]) => key !== 'agentType')
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ');

    const parts = [prefix, entry.message];
    if (contextStr) {
      parts.push(`(${contextStr})`);
    }
    if (entry.duration !== undefined) {
      parts.push(`[${entry.duration}ms]`);
    }

    const output = parts.join(' ');

    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.output(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatEntry('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const entry = this.formatEntry('error', message, context);
      if (error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      }
      this.output(entry);
    }
  }

  /**
   * Log execution timing
   */
  time<T>(operation: string, fn: () => T, context?: LogContext): T {
    const start = performance.now();
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.then((res) => {
          const duration = Math.round(performance.now() - start);
          this.info(`${operation} completed`, { ...context, duration });
          return res;
        }).catch((err) => {
          const duration = Math.round(performance.now() - start);
          this.error(`${operation} failed`, err, { ...context, duration });
          throw err;
        }) as T;
      }
      const duration = Math.round(performance.now() - start);
      this.info(`${operation} completed`, { ...context, duration });
      return result;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      this.error(`${operation} failed`, err as Error, { ...context, duration });
      throw err;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): AgentLogger {
    const childLogger = new AgentLogger(this.agentType, this.minLevel);
    const originalOutput = childLogger['output'].bind(childLogger);
    childLogger['output'] = (entry: LogEntry) => {
      entry.context = { ...additionalContext, ...entry.context };
      originalOutput(entry);
    };
    return childLogger;
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * Create a logger for a specific agent
 */
export function createAgentLogger(agentType: string, minLevel?: LogLevel): AgentLogger {
  return new AgentLogger(agentType, minLevel);
}
