"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slowQueryLogger = slowQueryLogger;
function slowQueryLogger(req, res, next) {
    const threshold = Number(process.env.SLOW_QUERY_MS || '0');
    if (!threshold) {
        return next();
    }
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        if (ms >= threshold && req.path.startsWith('/graphql')) {
            console.warn(JSON.stringify({
                level: 'warn',
                type: 'slow_query',
                ms,
                path: req.path,
                status: res.statusCode,
            }));
        }
    });
    next();
}
