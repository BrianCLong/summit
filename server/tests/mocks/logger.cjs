const logger = {
  info: () => { },
  error: () => { },
  warn: () => { },
  debug: () => { },
  child: function () { return this; },
  trace: () => { },
  fatal: () => { },
  silent: () => { },
  level: 'info',
  bindings: () => ({}),
  flush: () => { },
  stdSerializers: {
    err: (e) => e,
    req: (r) => r,
    res: (r) => r,
  }
};

const pino = (opts) => logger;

module.exports = pino;
module.exports.default = pino;
module.exports.pino = pino;
module.exports.stdSerializers = logger.stdSerializers;
