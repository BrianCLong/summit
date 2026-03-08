"use strict";
/**
 * Logger Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const logger_js_1 = require("../src/logger.js");
(0, vitest_1.describe)('Logger', () => {
    (0, vitest_1.it)('should create a logger with service name', () => {
        const logger = (0, logger_js_1.createLogger)('test-service');
        (0, vitest_1.expect)(logger).toBeInstanceOf(logger_js_1.Logger);
    });
    (0, vitest_1.it)('should log messages at different levels', () => {
        const logs = [];
        const logger = new logger_js_1.Logger({
            service: 'test',
            level: 'debug',
            output: (entry) => logs.push(entry),
        });
        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');
        (0, vitest_1.expect)(logs).toHaveLength(4);
        (0, vitest_1.expect)(logs[0].level).toBe('debug');
        (0, vitest_1.expect)(logs[1].level).toBe('info');
        (0, vitest_1.expect)(logs[2].level).toBe('warn');
        (0, vitest_1.expect)(logs[3].level).toBe('error');
    });
    (0, vitest_1.it)('should filter messages below log level', () => {
        const logs = [];
        const logger = new logger_js_1.Logger({
            service: 'test',
            level: 'warn',
            output: (entry) => logs.push(entry),
        });
        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');
        (0, vitest_1.expect)(logs).toHaveLength(2);
        (0, vitest_1.expect)(logs[0].level).toBe('warn');
        (0, vitest_1.expect)(logs[1].level).toBe('error');
    });
    (0, vitest_1.it)('should include context in log entries', () => {
        const logs = [];
        const logger = new logger_js_1.Logger({
            service: 'test',
            level: 'info',
            output: (entry) => logs.push(entry),
        });
        logger.info('test message', { taskId: '123', duration: 500 });
        (0, vitest_1.expect)(logs[0].context.taskId).toBe('123');
        (0, vitest_1.expect)(logs[0].context.duration).toBe(500);
    });
    (0, vitest_1.it)('should create child loggers with inherited context', () => {
        const logs = [];
        const logger = new logger_js_1.Logger({
            service: 'test',
            level: 'info',
            output: (entry) => logs.push(entry),
        });
        const child = logger.child({ traceId: 'abc-123' });
        child.info('child message');
        (0, vitest_1.expect)(logs[0].context.traceId).toBe('abc-123');
        (0, vitest_1.expect)(logs[0].context.service).toBe('test');
    });
});
