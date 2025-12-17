/**
 * Logger Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { Logger, createLogger, type LogEntry } from '../src/logger.js';

describe('Logger', () => {
  it('should create a logger with service name', () => {
    const logger = createLogger('test-service');
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should log messages at different levels', () => {
    const logs: LogEntry[] = [];
    const logger = new Logger({
      service: 'test',
      level: 'debug',
      output: (entry) => logs.push(entry),
    });

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(logs).toHaveLength(4);
    expect(logs[0].level).toBe('debug');
    expect(logs[1].level).toBe('info');
    expect(logs[2].level).toBe('warn');
    expect(logs[3].level).toBe('error');
  });

  it('should filter messages below log level', () => {
    const logs: LogEntry[] = [];
    const logger = new Logger({
      service: 'test',
      level: 'warn',
      output: (entry) => logs.push(entry),
    });

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe('warn');
    expect(logs[1].level).toBe('error');
  });

  it('should include context in log entries', () => {
    const logs: LogEntry[] = [];
    const logger = new Logger({
      service: 'test',
      level: 'info',
      output: (entry) => logs.push(entry),
    });

    logger.info('test message', { taskId: '123', duration: 500 });

    expect(logs[0].context.taskId).toBe('123');
    expect(logs[0].context.duration).toBe(500);
  });

  it('should create child loggers with inherited context', () => {
    const logs: LogEntry[] = [];
    const logger = new Logger({
      service: 'test',
      level: 'info',
      output: (entry) => logs.push(entry),
    });

    const child = logger.child({ traceId: 'abc-123' });
    child.info('child message');

    expect(logs[0].context.traceId).toBe('abc-123');
    expect(logs[0].context.service).toBe('test');
  });
});
