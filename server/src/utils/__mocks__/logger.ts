const noop = () => {};

const mockLogger: any = {
  info: noop,
  error: noop,
  warn: noop,
  debug: noop,
  trace: noop,
  fatal: noop,
  silent: noop,
  child: function() { return mockLogger; },
};

export default mockLogger;
export const logger = mockLogger;
