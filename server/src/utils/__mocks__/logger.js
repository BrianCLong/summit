"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const noop = () => { };
const mockLogger = {
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    trace: noop,
    fatal: noop,
    silent: noop,
    child: function () { return mockLogger; },
};
exports.default = mockLogger;
exports.logger = mockLogger;
