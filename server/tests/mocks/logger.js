"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createTestLogger = createTestLogger;
function createTestLogger() {
    const noop = () => undefined;
    const logger = {
        fatal: noop,
        error: noop,
        warn: noop,
        info: noop,
        debug: noop,
        trace: noop,
        child: () => logger,
        level: 'silent',
        flush: noop,
        bindings: () => ({}),
        setBindings: noop,
        isLevelEnabled: () => false,
    };
    return logger;
}
const logger = createTestLogger();
exports.logger = logger;
exports.default = logger;
