"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredConsoleLogger = void 0;
exports.createLogger = createLogger;
class StructuredConsoleLogger {
    scope;
    constructor(scope) {
        this.scope = scope;
    }
    info(message, context = {}) {
        this.write('info', message, context);
    }
    warn(message, context = {}) {
        this.write('warn', message, context);
    }
    error(message, context = {}) {
        this.write('error', message, context);
    }
    write(level, message, context) {
        const payload = {
            level,
            scope: this.scope,
            message,
            timestamp: new Date().toISOString(),
            ...context
        };
        // eslint-disable-next-line no-console
        console[level](JSON.stringify(payload));
    }
}
exports.StructuredConsoleLogger = StructuredConsoleLogger;
function createLogger(scope) {
    return new StructuredConsoleLogger(scope);
}
