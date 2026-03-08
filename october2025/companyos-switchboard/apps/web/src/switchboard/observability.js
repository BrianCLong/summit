"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopMetrics = exports.ConsoleLogger = void 0;
exports.getErrorMessage = getErrorMessage;
class ConsoleLogger {
    info(message, meta) {
        console.log(JSON.stringify({ level: 'info', message, ...meta }));
    }
    warn(message, meta) {
        console.warn(JSON.stringify({ level: 'warn', message, ...meta }));
    }
    error(message, meta) {
        console.error(JSON.stringify({ level: 'error', message, ...meta }));
    }
    debug(message, meta) {
        console.debug(JSON.stringify({ level: 'debug', message, ...meta }));
    }
}
exports.ConsoleLogger = ConsoleLogger;
class NoopMetrics {
    increment() { }
    histogram() { }
}
exports.NoopMetrics = NoopMetrics;
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
