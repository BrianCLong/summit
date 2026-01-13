const logger = {
  child() {
    return this;
  },
  debug() {},
  info() {},
  warn() {},
  error() {},
  trace() {},
  fatal() {},
  silent() {},
  level: 'silent',
};

const correlationStorage = {
  getStore: () => undefined,
  run: (_store: unknown, fn: () => void) => fn(),
  enterWith: () => undefined,
};

export { correlationStorage, logger };
export default logger;
