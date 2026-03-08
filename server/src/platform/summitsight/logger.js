"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredLogger = void 0;
class StructuredLogger {
    serviceName;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    info(message, context = {}) {
        this.log('INFO', message, context);
    }
    error(message, context = {}) {
        this.log('ERROR', message, context);
    }
    warn(message, context = {}) {
        this.log('WARN', message, context);
    }
    debug(message, context = {}) {
        this.log('DEBUG', message, context);
    }
    log(severity, message, context) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            severity,
            serviceName: this.serviceName,
            message,
            ...context
        }));
    }
}
exports.StructuredLogger = StructuredLogger;
