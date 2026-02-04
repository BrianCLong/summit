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

const pino = (opts?: any) => mockLogger;
pino.pino = pino;
pino.default = pino;
pino.stdSerializers = {
    req: (req: any) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
    }),
    res: (res: any) => ({
        statusCode: res.statusCode,
    }),
    err: (err: any) => ({
        type: err.type,
        message: err.message,
        stack: err.stack,
    })
};

export default pino;
export { pino };
