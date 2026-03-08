"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pino = void 0;
const mockLogger = {
    info: () => { },
    error: () => { },
    warn: () => { },
    debug: () => { },
    child: function () { return this; },
    level: 'info',
    bindings: () => ({}),
    setBindings: () => { },
    flush: () => { },
    version: '8.0.0'
};
const pino = (opts) => mockLogger;
exports.pino = pino;
pino.pino = pino;
pino.default = pino;
pino.stdSerializers = {
    req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
    }),
    res: (res) => ({
        statusCode: res.statusCode,
    }),
    err: (err) => ({
        type: err.type,
        message: err.message,
        stack: err.stack,
    })
};
exports.default = pino;
