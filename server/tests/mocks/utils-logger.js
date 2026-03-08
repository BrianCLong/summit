"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.logger = void 0;
exports.logger = {
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
const createLogger = () => exports.logger;
exports.createLogger = createLogger;
exports.default = exports.logger;
