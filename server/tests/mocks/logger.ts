// Logger mock with dual ESM/CJS support
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
  run: (_store: unknown, fn: () => unknown) => fn(),
  enterWith: () => undefined,
};

export const logger = loggerImpl;
export const correlationStorage = correlationStorageImpl;
export default loggerImpl;
