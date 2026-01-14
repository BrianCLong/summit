// CommonJS version of logger mock
// We don't import from @jest/globals here because it might conflict with the test environment
// Instead we expect the test files to have setup globals or we use a simplified mock

const logger = {
  child: () => logger,
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  trace: () => {},
  fatal: () => {},
  silent: () => {},
  level: 'silent',
};

// If jest is available globally (which it is in Jest environment), we can spy on these
if (typeof jest !== 'undefined') {
  logger.child = jest.fn().mockReturnValue(logger);
  logger.debug = jest.fn();
  logger.info = jest.fn();
  logger.warn = jest.fn();
  logger.error = jest.fn();
  logger.trace = jest.fn();
  logger.fatal = jest.fn();
  logger.silent = jest.fn();
}

const correlationStorage = {
  getStore: () => {},
  run: (_store, fn) => fn(),
  enterWith: () => {},
};

if (typeof jest !== 'undefined') {
  correlationStorage.getStore = jest.fn();
  correlationStorage.enterWith = jest.fn();
}

module.exports = {
  logger,
  correlationStorage,
  default: logger, // For ESM compatibility
};
