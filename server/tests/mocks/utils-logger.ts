export const logger = {
  info: () => { },
  error: () => { },
  warn: () => { },
  debug: () => { },
  child: function () {
    return this;
  },
  trace: () => { },
  fatal: () => { },
  silent: () => { },
  level: 'info',
  bindings: () => ({}),
  flush: () => { },
};

export const createLogger = () => logger;

export default logger;
