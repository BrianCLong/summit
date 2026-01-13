// Logger mock - CommonJS version for dual ESM/CJS compatibility
const loggerImpl = {
  child: function () { return this; },
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  trace: () => {},
  fatal: () => {},
  silent: () => {},
  level: 'silent',
};

const correlationStorageImpl = {
  getStore: () => undefined,
  run: (_store, fn) => fn(),
  enterWith: () => undefined,
};

module.exports = loggerImpl;
module.exports.logger = loggerImpl;
module.exports.correlationStorage = correlationStorageImpl;
module.exports.default = loggerImpl;
