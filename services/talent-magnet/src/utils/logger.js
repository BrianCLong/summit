"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChildLogger = exports.logger = void 0;
const createLogFn = (level, context) => {
    return (objOrMsg, msg) => {
        const prefix = context ? `[${context}]` : '';
        if (typeof objOrMsg === 'string') {
            // eslint-disable-next-line no-console
            console[level](`${prefix} ${objOrMsg}`);
        }
        else {
            // eslint-disable-next-line no-console
            console[level](`${prefix}`, msg || '', objOrMsg);
        }
    };
};
const createLogger = (context) => ({
    info: createLogFn('info', context),
    warn: createLogFn('warn', context),
    error: createLogFn('error', context),
    debug: createLogFn('debug', context),
    child: (bindings) => createLogger(context ? `${context}:${JSON.stringify(bindings)}` : JSON.stringify(bindings)),
});
exports.logger = createLogger('talent-magnet');
const createChildLogger = (context) => createLogger(context);
exports.createChildLogger = createChildLogger;
