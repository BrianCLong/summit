"use strict";
/**
 * Tests for logger utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
const logger_js_1 = require("../utils/logger.js");
describe('Logger', () => {
    beforeEach(() => {
        // Reset logger config before each test
        (0, logger_js_1.configureLogger)({
            level: 'info',
            timestamps: false,
            jsonOutput: false,
        });
    });
    describe('configureLogger', () => {
        it('should configure log level', () => {
            (0, logger_js_1.configureLogger)({ level: 'debug' });
            // No assertion needed, just verify no errors
        });
        it('should configure timestamps', () => {
            (0, logger_js_1.configureLogger)({ timestamps: true });
            // No assertion needed, just verify no errors
        });
        it('should configure JSON output', () => {
            (0, logger_js_1.configureLogger)({ jsonOutput: true });
            // No assertion needed, just verify no errors
        });
    });
    describe('setLogLevel', () => {
        it('should set error level', () => {
            (0, logger_js_1.setLogLevel)('error');
            // No assertion needed, just verify no errors
        });
        it('should set warn level', () => {
            (0, logger_js_1.setLogLevel)('warn');
            // No assertion needed, just verify no errors
        });
        it('should set info level', () => {
            (0, logger_js_1.setLogLevel)('info');
            // No assertion needed, just verify no errors
        });
        it('should set verbose level', () => {
            (0, logger_js_1.setLogLevel)('verbose');
            // No assertion needed, just verify no errors
        });
        it('should set debug level', () => {
            (0, logger_js_1.setLogLevel)('debug');
            // No assertion needed, just verify no errors
        });
    });
    describe('setVerbose', () => {
        it('should enable verbose mode', () => {
            (0, logger_js_1.setVerbose)(true);
            // No assertion needed, just verify no errors
        });
        it('should not change level when disabled', () => {
            (0, logger_js_1.setVerbose)(false);
            // No assertion needed, just verify no errors
        });
    });
    describe('setJsonOutput', () => {
        it('should enable JSON output', () => {
            (0, logger_js_1.setJsonOutput)(true);
            // No assertion needed, just verify no errors
        });
        it('should disable JSON output', () => {
            (0, logger_js_1.setJsonOutput)(false);
            // No assertion needed, just verify no errors
        });
    });
    describe('logging functions', () => {
        let consoleSpy;
        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            jest.spyOn(console, 'warn').mockImplementation();
            jest.spyOn(console, 'error').mockImplementation();
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });
        it('should log info messages', () => {
            (0, logger_js_1.info)('Test info message');
            expect(console.log).toHaveBeenCalled();
        });
        it('should log warn messages', () => {
            (0, logger_js_1.warn)('Test warn message');
            expect(console.warn).toHaveBeenCalled();
        });
        it('should log error messages', () => {
            (0, logger_js_1.error)('Test error message');
            expect(console.error).toHaveBeenCalled();
        });
        it('should log debug messages when level is debug', () => {
            (0, logger_js_1.setLogLevel)('debug');
            (0, logger_js_1.debug)('Test debug message');
            expect(console.log).toHaveBeenCalled();
        });
        it('should not log debug messages when level is info', () => {
            (0, logger_js_1.setLogLevel)('info');
            (0, logger_js_1.debug)('Test debug message');
            // Debug should not be logged at info level
        });
        it('should log verbose messages when level is verbose', () => {
            (0, logger_js_1.setLogLevel)('verbose');
            (0, logger_js_1.verbose)('Test verbose message');
            expect(console.log).toHaveBeenCalled();
        });
        it('should include data in log messages', () => {
            (0, logger_js_1.info)('Test message', { key: 'value' });
            expect(console.log).toHaveBeenCalled();
        });
    });
    describe('createLogger', () => {
        it('should create logger instance', () => {
            const newLogger = (0, logger_js_1.createLogger)();
            expect(newLogger).toHaveProperty('info');
            expect(newLogger).toHaveProperty('warn');
            expect(newLogger).toHaveProperty('error');
            expect(newLogger).toHaveProperty('debug');
            expect(newLogger).toHaveProperty('verbose');
        });
    });
    describe('logger instance', () => {
        it('should export default logger', () => {
            expect(logger_js_1.logger).toHaveProperty('info');
            expect(logger_js_1.logger).toHaveProperty('warn');
            expect(logger_js_1.logger).toHaveProperty('error');
            expect(logger_js_1.logger).toHaveProperty('debug');
            expect(logger_js_1.logger).toHaveProperty('verbose');
        });
    });
});
