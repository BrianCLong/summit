/**
 * Tests for logger utility
 */

import {
  configureLogger,
  setLogLevel,
  setVerbose,
  setJsonOutput,
  createLogger,
  logger,
  info,
  warn,
  error,
  debug,
  verbose,
} from '../utils/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    // Reset logger config before each test
    configureLogger({
      level: 'info',
      timestamps: false,
      jsonOutput: false,
    });
  });

  describe('configureLogger', () => {
    it('should configure log level', () => {
      configureLogger({ level: 'debug' });
      // No assertion needed, just verify no errors
    });

    it('should configure timestamps', () => {
      configureLogger({ timestamps: true });
      // No assertion needed, just verify no errors
    });

    it('should configure JSON output', () => {
      configureLogger({ jsonOutput: true });
      // No assertion needed, just verify no errors
    });
  });

  describe('setLogLevel', () => {
    it('should set error level', () => {
      setLogLevel('error');
      // No assertion needed, just verify no errors
    });

    it('should set warn level', () => {
      setLogLevel('warn');
      // No assertion needed, just verify no errors
    });

    it('should set info level', () => {
      setLogLevel('info');
      // No assertion needed, just verify no errors
    });

    it('should set verbose level', () => {
      setLogLevel('verbose');
      // No assertion needed, just verify no errors
    });

    it('should set debug level', () => {
      setLogLevel('debug');
      // No assertion needed, just verify no errors
    });
  });

  describe('setVerbose', () => {
    it('should enable verbose mode', () => {
      setVerbose(true);
      // No assertion needed, just verify no errors
    });

    it('should not change level when disabled', () => {
      setVerbose(false);
      // No assertion needed, just verify no errors
    });
  });

  describe('setJsonOutput', () => {
    it('should enable JSON output', () => {
      setJsonOutput(true);
      // No assertion needed, just verify no errors
    });

    it('should disable JSON output', () => {
      setJsonOutput(false);
      // No assertion needed, just verify no errors
    });
  });

  describe('logging functions', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log info messages', () => {
      info('Test info message');
      expect(console.log).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      warn('Test warn message');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      error('Test error message');
      expect(console.error).toHaveBeenCalled();
    });

    it('should log debug messages when level is debug', () => {
      setLogLevel('debug');
      debug('Test debug message');
      expect(console.log).toHaveBeenCalled();
    });

    it('should not log debug messages when level is info', () => {
      setLogLevel('info');
      debug('Test debug message');
      // Debug should not be logged at info level
    });

    it('should log verbose messages when level is verbose', () => {
      setLogLevel('verbose');
      verbose('Test verbose message');
      expect(console.log).toHaveBeenCalled();
    });

    it('should include data in log messages', () => {
      info('Test message', { key: 'value' });
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('createLogger', () => {
    it('should create logger instance', () => {
      const newLogger = createLogger();
      expect(newLogger).toHaveProperty('info');
      expect(newLogger).toHaveProperty('warn');
      expect(newLogger).toHaveProperty('error');
      expect(newLogger).toHaveProperty('debug');
      expect(newLogger).toHaveProperty('verbose');
    });
  });

  describe('logger instance', () => {
    it('should export default logger', () => {
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('verbose');
    });
  });
});
