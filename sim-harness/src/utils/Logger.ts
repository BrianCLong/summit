/**
 * Simple logger utility
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private context: string;
  private level: LogLevel;

  constructor(context: string, level: LogLevel = 'info') {
    this.context = context;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(5);
    return `[${timestamp}] ${levelUpper} [${this.context}] ${message}`;
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return '\x1b[36m'; // Cyan
      case 'info':
        return '\x1b[32m'; // Green
      case 'warn':
        return '\x1b[33m'; // Yellow
      case 'error':
        return '\x1b[31m'; // Red
      default:
        return '\x1b[0m'; // Reset
    }
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      const color = this.getColor('debug');
      const reset = '\x1b[0m';
      console.log(`${color}${this.formatMessage('debug', message)}${reset}`);
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      const color = this.getColor('info');
      const reset = '\x1b[0m';
      console.log(`${color}${this.formatMessage('info', message)}${reset}`);
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      const color = this.getColor('warn');
      const reset = '\x1b[0m';
      console.warn(`${color}${this.formatMessage('warn', message)}${reset}`);
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog('error')) {
      const color = this.getColor('error');
      const reset = '\x1b[0m';
      console.error(`${color}${this.formatMessage('error', message)}${reset}`);
      if (error) {
        console.error(error);
      }
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}
