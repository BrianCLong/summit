const logger = {
  child: () => logger,
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export const correlationStorage = {
  getStore: () => undefined,
};

export default logger;
export { logger };
