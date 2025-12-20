const noop = () => {};

const mockLogger = {
  info: noop,
  error: noop,
  warn: noop,
  debug: noop,
};

export default mockLogger;
export const logger = mockLogger;
