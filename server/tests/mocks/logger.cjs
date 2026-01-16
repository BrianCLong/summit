const fs = require('fs');
const logFile = '/tmp/debug_logger.txt';

// deterministic symbols for pino compatibility
const symbols = {
  stringifySym: Symbol('pino.stringify'),
  chindingsSym: Symbol('pino.chindings'),
  serializersSym: Symbol('pino.serializers'),
  asJsonSym: Symbol('pino.asJson'),
  writeSym: Symbol('pino.write'),
  formattersSym: Symbol('pino.formatters'),
};

const stdSerializers = {
  err: (e) => (e instanceof Error ? { message: e.message, stack: e.stack } : e),
  req: (r) => ({ method: r.method, url: r.url }),
  res: (r) => ({ statusCode: r.statusCode }),
};

const baseLogger = {
  child: jest.fn().mockImplementation(() => loggerInstance),
  debug: jest.fn().mockImplementation((...args) => {
    try { fs.appendFileSync(logFile, `DEBUG: ${JSON.stringify(args)}\n`); } catch (_) { }
  }),
  info: jest.fn().mockImplementation((...args) => {
    try { fs.appendFileSync(logFile, `INFO: ${JSON.stringify(args)}\n`); } catch (_) { }
  }),
  warn: jest.fn().mockImplementation((...args) => {
    try { fs.appendFileSync(logFile, `WARN: ${JSON.stringify(args)}\n`); } catch (_) { }
  }),
  error: jest.fn().mockImplementation((...args) => {
    try { fs.appendFileSync(logFile, `ERROR: ${JSON.stringify(args)}\n`); } catch (_) { }
  }),
  trace: jest.fn(),
  fatal: jest.fn(),
  silent: jest.fn(),
  flush: jest.fn(),
  level: 'debug',
  levels: {
    values: { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10 },
    labels: { 10: 'trace', 20: 'debug', 30: 'info', 40: 'warn', 50: 'error', 60: 'fatal' },
  },
};

// Decorate with symbols
baseLogger[symbols.stringifySym] = (val) => JSON.stringify(val);
baseLogger[symbols.chindingsSym] = '';
baseLogger[symbols.serializersSym] = stdSerializers;
baseLogger[symbols.asJsonSym] = (val) => JSON.stringify(val);
baseLogger[symbols.writeSym] = () => { };
baseLogger[symbols.formattersSym] = {
  level: (label) => ({ level: label }),
  bindings: (bindings) => bindings,
  log: (obj) => obj
};

const loggerInstance = new Proxy(baseLogger, {
  get(target, prop) {
    if (typeof prop === 'symbol' && target[prop]) return target[prop];
    return target[prop];
  },
  has(target, prop) {
    if (typeof prop === 'symbol' && target[prop]) return true;
    return prop in target;
  }
});

const pinoMock = (...args) => loggerInstance;

Object.assign(pinoMock, loggerInstance);
pinoMock.symbols = symbols;
pinoMock.stdSerializers = stdSerializers;
pinoMock.pino = pinoMock;
pinoMock.default = pinoMock;

const correlationStorage = {
  getStore: jest.fn(),
  run: (store, fn) => fn(),
  enterWith: jest.fn(),
};

pinoMock.correlationStorage = correlationStorage;

module.exports = pinoMock;
module.exports.logger = loggerInstance;
module.exports.correlationStorage = correlationStorage;
module.exports.pino = pinoMock;
module.exports.symbols = symbols;
module.exports.stdSerializers = stdSerializers;
module.exports.__esModule = true;
module.exports.default = pinoMock;
