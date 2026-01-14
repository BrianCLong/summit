// Logger mock - CommonJS version for dual ESM/CJS compatibility
const loggerImpl = {
  child: function () { return this; },
  debug: () => { },
  info: () => { },
  warn: () => { },
  error: () => { },
  trace: () => { },
  fatal: () => { },
  silent: () => { },
  level: 'silent',
};

const correlationStorageImpl = {
  getStore: () => undefined,
  run: (_store, fn) => fn(),
  enterWith: () => undefined,
};

// Explicit named exports object to ensure ESM interop works
module.exports = {
  ...loggerImpl,
  default: loggerImpl,
  logger: loggerImpl,
  correlationStorage: correlationStorageImpl,
};
